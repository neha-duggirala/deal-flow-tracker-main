"""
DealFlow Multi-Agent Graph  — LangGraph + Qdrant Cloud

Nodes:  Scribe → Analyst → Strategist → Gatekeeper → Executor
       (Gatekeeper routes to HITL or auto-approves based on confidence)
"""

import operator
from typing import Annotated, List, TypedDict

from langchain_core.messages import BaseMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import interrupt, Command

from brain import LLM
from config import MODEL_NAME, CONFIDENCE_THRESHOLD
from models import BottleneckAnalysis, StrategyOutput
import qdrant_service


# ═══════════════════════════════════════════════════════════════════════════
# 1.  State — the shared "mind" of every node
# ═══════════════════════════════════════════════════════════════════════════

class AgentState(TypedDict):
    messages: Annotated[List[BaseMessage], operator.add]
    deal_id: str
    sector: str
    parties: str
    context_snippets: List[str]
    detected_bottlenecks: List[str]
    suggested_tasks: List[str]
    suggested_draft: str
    confidence_score: float
    risk_level: str
    fingerprints: List[str]
    is_validated: bool
    requires_review: bool
    summary: str


# ═══════════════════════════════════════════════════════════════════════════
# 2.  Node implementations
# ═══════════════════════════════════════════════════════════════════════════

class DealFlowAgents:
    """Each method is a LangGraph node function (state → partial-state)."""

    def __init__(self):
        llm_factory = LLM(provider=MODEL_NAME)
        self.llm = llm_factory.get_model()

    # ── Scribe ──────────────────────────────────────────────────────────
    def scribe_node(self, state: AgentState) -> dict:
        """
        Store the new communication in Qdrant and retrieve
        the most similar past context for this deal.
        """
        new_msg = state["messages"][-1].content
        deal_id = state.get("deal_id", "UNKNOWN")

        # Upsert into Qdrant
        qdrant_service.upsert_text(
            text=new_msg,
            metadata={
                "deal_id": deal_id,
                "sector": state.get("sector", ""),
                "parties": state.get("parties", ""),
            },
        )

        # Similarity search for context
        hits = qdrant_service.search_similar(
            query=new_msg,
            k=5,
            filter_conditions={"deal_id": deal_id},
        )
        snippets = [h["payload"].get("text", "") for h in hits if h["payload"].get("text")]

        return {"context_snippets": snippets}

    # ── Analyst ─────────────────────────────────────────────────────────
    def analyst_node(self, state: AgentState) -> dict:
        """
        Analyse context + message to detect bottlenecks, risk, and
        semantic fingerprints via structured LLM output.
        """
        context = "\n".join(state.get("context_snippets", []))
        latest_msg = state["messages"][-1].content

        structured_llm = self.llm.with_structured_output(BottleneckAnalysis)

        prompt = ChatPromptTemplate.from_messages([
            ("system", (
                "You are an expert India–Russia trade analyst at Sberbank. "
                "Analyze the communication and prior context to identify "
                "bottlenecks, risk level, and semantic fingerprints."
            )),
            ("user", (
                "Deal ID: {deal_id}\n"
                "Sector: {sector}\n"
                "Prior context:\n{context}\n\n"
                "Latest communication:\n{message}\n\n"
                "Provide your bottleneck analysis."
            )),
        ])

        chain = prompt | structured_llm
        result: BottleneckAnalysis = chain.invoke({
            "deal_id": state.get("deal_id", "UNKNOWN"),
            "sector": state.get("sector", ""),
            "context": context or "No prior context available.",
            "message": latest_msg,
        })

        return {
            "detected_bottlenecks": result.bottlenecks if result.bottlenecks else [result.bottleneck_status],
            "risk_level": result.risk_level,
            "fingerprints": result.fingerprints,
            "summary": result.summary,
        }

    # ── Strategist ──────────────────────────────────────────────────────
    def strategist_node(self, state: AgentState) -> dict:
        """
        Generate actionable task + draft message for the Sber specialist.
        Also output a confidence score used by the gatekeeper.
        """
        structured_llm = self.llm.with_structured_output(StrategyOutput)

        prompt = ChatPromptTemplate.from_messages([
            ("system", (
                "You are a senior Sberbank Business-Development strategist. "
                "Given the detected bottlenecks and risk, propose a concrete "
                "task for the specialist, draft a client-facing message, and "
                "rate your confidence (0.0–1.0) in the recommendation."
            )),
            ("user", (
                "Deal ID: {deal_id}\n"
                "Sector: {sector}\n"
                "Bottlenecks: {bottlenecks}\n"
                "Risk level: {risk_level}\n"
                "Summary so far: {summary}\n\n"
                "Provide your strategy."
            )),
        ])

        chain = prompt | structured_llm
        result: StrategyOutput = chain.invoke({
            "deal_id": state.get("deal_id", "UNKNOWN"),
            "sector": state.get("sector", ""),
            "bottlenecks": ", ".join(state.get("detected_bottlenecks", [])),
            "risk_level": state.get("risk_level", "Medium"),
            "summary": state.get("summary", ""),
        })

        return {
            "suggested_tasks": [result.suggested_task],
            "suggested_draft": result.suggested_draft,
            "confidence_score": result.confidence_score,
        }

    # ── Gatekeeper ──────────────────────────────────────────────────────
    def gatekeeper_node(self, state: AgentState) -> dict:
        """
        Decision gate:
        • confidence ≥ threshold AND risk != High  →  auto-approve
        • otherwise  →  pause for human review (HITL interrupt)
        """
        confidence = state.get("confidence_score", 0.0)
        risk = state.get("risk_level", "Medium")
        needs_hitl = confidence < CONFIDENCE_THRESHOLD or risk == "High"

        if not needs_hitl:
            # Auto-approve – high confidence, acceptable risk
            return {"is_validated": True, "requires_review": False}

        # ── HITL path: interrupt and wait for specialist ────────────
        review_payload = {
            "task_to_approve": state["suggested_tasks"][-1],
            "suggested_draft": state.get("suggested_draft", ""),
            "bottleneck_found": state.get("detected_bottlenecks", ["N/A"])[-1],
            "confidence_score": confidence,
            "risk_level": risk,
        }

        human_input = interrupt(review_payload)

        if human_input.get("action") == "approve":
            edited = human_input.get("edited_task", state["suggested_tasks"][-1])
            return {
                "is_validated": True,
                "requires_review": False,
                "suggested_tasks": [edited],
            }
        else:
            # Rejected → route back to Strategist via conditional edge
            return {"is_validated": False, "requires_review": True}

    # ── Executor ────────────────────────────────────────────────────────
    def executor_node(self, state: AgentState) -> dict:
        """
        Finalise: persist the approved task back into Qdrant as a
        resolved action AND save to backend database.
        """
        final_task = state["suggested_tasks"][-1]
        confidence = state.get("confidence_score", 0.5)
        deal_id = state.get("deal_id", "UNKNOWN")

        # Store the finalized task in Qdrant for future context
        qdrant_service.upsert_text(
            text=f"[TASK FINALIZED] {final_task}",
            metadata={
                "deal_id": deal_id,
                "type": "finalized_task",
                "risk_level": state.get("risk_level", ""),
                "fingerprints": state.get("fingerprints", []),
                "confidence": confidence,
            },
        )

        # NEW: Also save to backend database
        try:
            import requests
            
            # Parse deal_id (format: ID-RUS-YYYY-####)
            deal_id_parts = str(deal_id).split("-")
            db_deal_id = deal_id_parts[-1] if deal_id_parts else "0"
            
            # Map confidence to priority
            priority = (
                "CRITICAL" if confidence > 0.85
                else "HIGH" if confidence > 0.70
                else "MEDIUM" if confidence > 0.50
                else "LOW"
            )
            
            # Call backend API to save the action
            response = requests.post(
                "http://localhost:8080/api/ai-actions",
                json={
                    "dealId": int(db_deal_id),
                    "description": final_task,
                    "priority": priority,
                    "status": "PENDING",
                    "assignedToUserId": 1
                },
                timeout=5
            )
            
            if response.status_code in [200, 201]:
                print(f"✅ AI action saved to backend: {final_task}")
            else:
                print(f"⚠️  Backend returned {response.status_code}: {response.text}")
                
        except Exception as e:
            print(f"⚠️  Could not save AI action to backend: {str(e)}")
            print("   Continuing without backend persistence (data in Qdrant only)")

        return {
            "is_validated": True,
            "requires_review": False,
        }


# ═══════════════════════════════════════════════════════════════════════════
# 3.  Graph construction
# ═══════════════════════════════════════════════════════════════════════════

def build_dealflow_graph():
    """Build and compile the full DealFlow StateGraph."""
    agents = DealFlowAgents()
    workflow = StateGraph(AgentState)

    # Nodes
    workflow.add_node("scribe", agents.scribe_node)
    workflow.add_node("analyst", agents.analyst_node)
    workflow.add_node("strategist", agents.strategist_node)
    workflow.add_node("gatekeeper", agents.gatekeeper_node)
    workflow.add_node("executor", agents.executor_node)

    # Edges
    workflow.add_edge(START, "scribe")
    workflow.add_edge("scribe", "analyst")
    workflow.add_edge("analyst", "strategist")
    workflow.add_edge("strategist", "gatekeeper")

    # Conditional: gatekeeper → executor  OR  gatekeeper → strategist (retry)
    def route_after_gatekeeper(state: AgentState) -> str:
        if state.get("is_validated"):
            return "executor"
        return "strategist"

    workflow.add_conditional_edges("gatekeeper", route_after_gatekeeper)
    workflow.add_edge("executor", END)

    # Persistence is required for the `interrupt` HITL to work
    checkpointer = InMemorySaver()
    return workflow.compile(checkpointer=checkpointer)


# ═══════════════════════════════════════════════════════════════════════════
# 4.  Quick local test
# ═══════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    graph = build_dealflow_graph()
    config = {"configurable": {"thread_id": "test_session_1"}}

    initial_state = {
        "messages": [
            HumanMessage(
                content="We cannot proceed with the shipment until the "
                        "currency conversion rate for the INR payment is "
                        "locked in at the rate discussed last week."
            )
        ],
        "deal_id": "IND-RUS-2026-0042",
        "sector": "Pharmaceuticals",
        "parties": "MedCorp Moscow <> BioPharma Mumbai",
        "context_snippets": [],
        "detected_bottlenecks": [],
        "suggested_tasks": [],
        "suggested_draft": "",
        "confidence_score": 0.0,
        "risk_level": "",
        "fingerprints": [],
        "is_validated": False,
        "requires_review": False,
        "summary": "",
    }

    print("\n--- Starting Deal Analysis ---")
    for event in graph.stream(initial_state, config):
        print(event)
        if "__interrupt__" in event:
            print("⏸️  Gatekeeper paused — awaiting specialist review")
            print("   Payload:", event["__interrupt__"])