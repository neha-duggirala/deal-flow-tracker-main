"""
FastAPI server for the DealFlow Multi-Agent system.
Exposes REST endpoints consumed by the Java Spring Boot backend.

Run:  uvicorn main:app --host 127.0.0.1 --port 8005 --reload
"""

import json
import uuid
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.messages import HumanMessage
from langgraph.types import Command

from graph import build_dealflow_graph
from models import (
    AnalyzeRequest,
    AnalyzeResponse,
    GatekeeperReviewRequest,
    GatekeeperReviewResponse,
    GraphStatusResponse,
    IngestResponse,
    DraftFollowupRequest,
    DraftFollowupResponse,
    ApproveDraftRequest,
    ApproveDraftResponse,
)
import qdrant_service

# ═══════════════════════════════════════════════════════════════════════════
# App setup
# ═══════════════════════════════════════════════════════════════════════════

app = FastAPI(
    title="DealFlow AI Agent",
    description="Multi-agent LangGraph system for India–Russia trade deal analysis",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Compile the graph once at startup
deal_graph = build_dealflow_graph()

# In-memory map: thread_id → latest snapshot (for status polling)
_thread_states: dict[str, dict] = {}


# Custom error handler for validation errors
from fastapi.exceptions import RequestValidationError

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    print(f"\n⚠️ Validation Error on {request.url.path}:")
    for error in exc.errors():
        print(f"   - {error['loc']}: {error['msg']}")
    return {
        "detail": "Invalid request format",
        "errors": [{"field": str(e["loc"]), "message": e["msg"]} for e in exc.errors()]
    }


# ═══════════════════════════════════════════════════════════════════════════
# Helper: run graph and collect final state
# ═══════════════════════════════════════════════════════════════════════════

def _run_graph(initial_state: dict, thread_id: str) -> dict:
    """
    Stream the graph to completion (or until HITL interrupt).
    Returns the merged final state dict.
    """
    config = {"configurable": {"thread_id": thread_id}}
    final_state = dict(initial_state)
    interrupted = False
    interrupt_payload = None

    for event in deal_graph.stream(initial_state, config):
        if "__interrupt__" in event:
            interrupted = True
            interrupts = event["__interrupt__"]
            if isinstance(interrupts, list) and len(interrupts) > 0:
                interrupt_payload = interrupts[0].value
            elif hasattr(interrupts, "value"):
                interrupt_payload = interrupts.value
            else:
                interrupt_payload = interrupts
        else:
            # Each event is {node_name: partial_state}
            for _node, partial in event.items():
                if isinstance(partial, dict):
                    final_state.update(partial)

    if interrupted and interrupt_payload:
        final_state["_interrupted"] = True
        final_state["_interrupt_payload"] = interrupt_payload
    else:
        final_state["_interrupted"] = False

    _thread_states[thread_id] = final_state
    return final_state


# ═══════════════════════════════════════════════════════════════════════════
# Endpoints
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/health")
async def health():
    return {"status": "ok"}


# ── POST /api/analyze ───────────────────────────────────────────────────
@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_deal(request: AnalyzeRequest):
    """
    Run the full graph: Scribe → Analyst → Strategist → Gatekeeper.
    Backward-compatible with the Java DealController.
    """
    try:
        # Log incoming request for debugging
        print(f"\n📊 Analyze Deal Request:")
        print(f"   Deal ID: {request.deal_id}")
        print(f"   Sector: {request.sector}")
        print(f"   Parties: {request.parties}")
        print(f"   Messages Count: {len(request.messages)}")
        if request.messages:
            print(f"   First Message: {request.messages[0].sender} → {request.messages[0].content[:50]}...")
        
        # Combine all messages into one concatenated communication
        combined_text = "\n".join(
            f"[{m.sender}] {m.content}" for m in request.messages
        )

        thread_id = f"{request.deal_id}_{uuid.uuid4().hex[:8]}"

        initial_state = {
            "messages": [HumanMessage(content=combined_text)],
            "deal_id": request.deal_id or "UNKNOWN",
            "sector": request.sector or "",
            "parties": request.parties or "",
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

        final = _run_graph(initial_state, thread_id)

        # Determine status label for the Java backend
        risk = final.get("risk_level", "Medium")
        bottlenecks = final.get("detected_bottlenecks", [])
        if risk == "High" or len(bottlenecks) > 0:
            status = "Blocked" if risk == "High" else "Action Needed"
        else:
            status = "On Track"

        # Get suggested task safely from list
        tasks = final.get("suggested_tasks", []) or ["Monitor deal"]
        suggested_task = tasks[-1] if tasks else "Monitor deal"
        
        response_data = AnalyzeResponse(
            status=status,
            bottleneck="; ".join(bottlenecks) if bottlenecks else "None",
            suggested_task=suggested_task,
            suggested_draft=final.get("suggested_draft", ""),
            risk_level=risk,
            confidence_score=final.get("confidence_score", 0.0),
            fingerprints=final.get("fingerprints", []),
            requires_review=final.get("_interrupted", False),
            thread_id=thread_id,
        )
        
        print(f"\n✅ Analysis Complete: {response_data.status} | Risk: {response_data.risk_level}\n")
        
        return response_data
        
    except Exception as e:
        print(f"\n❌ Error in /api/analyze: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


# ── POST /api/review ───────────────────────────────────────────────────
@app.post("/api/review", response_model=GatekeeperReviewResponse)
async def review_task(request: GatekeeperReviewRequest):
    """
    Resume the gatekeeper after HITL review (approve / reject / edit).
    """
    config = {"configurable": {"thread_id": request.thread_id}}

    resume_payload = {"action": request.action}
    if request.edited_task:
        resume_payload["edited_task"] = request.edited_task

    command = Command(resume=resume_payload)

    final_state = {}
    for event in deal_graph.stream(command, config):
        if "__interrupt__" in event:
            # Re-interrupted (rejected → strategist → gatekeeper again)
            return GatekeeperReviewResponse(
                final_task="",
                is_finalized=False,
                status="awaiting_review",
            )
        for _node, partial in event.items():
            if isinstance(partial, dict):
                final_state.update(partial)

    _thread_states[request.thread_id] = final_state

    return GatekeeperReviewResponse(
        final_task=final_state.get("suggested_tasks", [""])[-1] if final_state.get("suggested_tasks") else "",
        is_finalized=final_state.get("is_validated", False),
        status="completed",
    )


# ── GET /api/deals/{deal_id}/status ─────────────────────────────────────
@app.get("/api/deals/{deal_id}/status", response_model=GraphStatusResponse)
async def deal_status(deal_id: str):
    """
    Return the latest known state for a deal (polling endpoint).
    """
    # Find the latest thread for this deal
    matching = {
        tid: s for tid, s in _thread_states.items()
        if s.get("deal_id") == deal_id
    }
    if not matching:
        raise HTTPException(404, f"No active session found for deal {deal_id}")

    latest_tid = list(matching.keys())[-1]
    state = matching[latest_tid]

    return GraphStatusResponse(
        deal_id=deal_id,
        current_node="gatekeeper" if state.get("_interrupted") else "completed",
        is_waiting_for_review=state.get("_interrupted", False),
        state_snapshot={
            "bottlenecks": state.get("detected_bottlenecks", []),
            "suggested_task": state.get("suggested_tasks", [""])[-1] if state.get("suggested_tasks") else "",
            "risk_level": state.get("risk_level", ""),
            "confidence_score": state.get("confidence_score", 0.0),
            "fingerprints": state.get("fingerprints", []),
            "thread_id": latest_tid,
        },
    )


# ── POST /api/deals/{deal_id}/ingest ────────────────────────────────────
@app.post("/api/deals/{deal_id}/ingest", response_model=IngestResponse)
async def ingest_deal(deal_id: str):
    """
    Load a deal from synthetic_data.json and ingest all its
    communications into Qdrant (for pre-seeding context).
    """
    data_path = Path(__file__).parent / "data" / "synthetic_data.json"
    if not data_path.exists():
        raise HTTPException(404, "synthetic_data.json not found")

    with open(data_path, "r", encoding="utf-8") as f:
        deals = json.load(f)

    deal = next((d for d in deals if d["deal_id"] == deal_id), None)
    if deal is None:
        raise HTTPException(404, f"Deal '{deal_id}' not found in synthetic data")

    count = 0
    for msg in deal.get("communication_history", []):
        qdrant_service.upsert_text(
            text=msg["content"],
            metadata={
                "deal_id": deal_id,
                "sender": msg.get("sender", ""),
                "timestamp": msg.get("timestamp", ""),
                "type": msg.get("type", ""),
                "sector": deal.get("sector", ""),
            },
        )
        count += 1

    return IngestResponse(
        deal_id=deal_id,
        points_created=count,
        message=f"Ingested {count} messages for deal {deal_id}",
    )


# ── POST /api/deals/ingest-all ──────────────────────────────────────────
@app.post("/api/deals/ingest-all")
async def ingest_all_deals():
    """
    Ingest ALL deals from synthetic_data.json into Qdrant.
    """
    data_path = Path(__file__).parent / "data" / "synthetic_data.json"
    if not data_path.exists():
        raise HTTPException(404, "synthetic_data.json not found")

    with open(data_path, "r", encoding="utf-8") as f:
        deals = json.load(f)

    total = 0
    results = []
    for deal in deals:
        deal_id = deal["deal_id"]
        count = 0
        for msg in deal.get("communication_history", []):
            qdrant_service.upsert_text(
                text=msg["content"],
                metadata={
                    "deal_id": deal_id,
                    "sender": msg.get("sender", ""),
                    "timestamp": msg.get("timestamp", ""),
                    "type": msg.get("type", ""),
                    "sector": deal.get("sector", ""),
                },
            )
            count += 1
        total += count
        results.append({"deal_id": deal_id, "messages_ingested": count})

    return {
        "total_points_created": total,
        "deals": results,
    }


# ── POST /api/draft-followup ─────────────────────────────────────────
@app.post("/api/draft-followup", response_model=DraftFollowupResponse)
async def draft_followup(request: DraftFollowupRequest):
    """
    Generate a follow-up email draft for a deal using the Strategist LLM.
    This is a lightweight endpoint that focuses on email generation
    without running the full analysis pipeline.
    """
    try:
        from brain import LLM
        from config import MODEL_NAME

        print(f"\n📧 Draft Follow-up Request:")
        print(f"   Deal ID: {request.deal_id}")
        print(f"   Sector: {request.sector}")
        print(f"   Risk: {request.risk_level}")

        llm_factory = LLM(provider=MODEL_NAME)
        llm = llm_factory.get_model()

        # Retrieve relevant context from Qdrant
        context_snippets = []
        try:
            hits = qdrant_service.search_similar(
                query=f"Deal {request.deal_id} {request.deal_title} follow-up",
                k=3,
                filter_conditions={"deal_id": request.deal_id},
            )
            context_snippets = [
                h["payload"].get("text", "")
                for h in hits
                if h["payload"].get("text")
            ]
        except Exception:
            pass

        context_text = "\n".join(context_snippets) if context_snippets else "No prior context."
        bottleneck_text = "; ".join(request.bottlenecks) if request.bottlenecks else "None identified"

        from langchain_core.prompts import ChatPromptTemplate

        prompt = ChatPromptTemplate.from_messages([
            ("system", (
                "You are a senior Sberbank Business-Development specialist drafting "
                "a professional follow-up email for an India–Russia trade deal. "
                "The email should be concise, actionable, and address any bottlenecks. "
                "Output EXACTLY three fields separated by '---FIELD---':\n"
                "1. SUBJECT: A clear email subject line\n"
                "2. RECIPIENT: The role/name of the primary recipient\n"
                "3. BODY: The full email body (professional tone, 150-300 words)"
            )),
            ("user", (
                "Deal ID: {deal_id}\n"
                "Deal Title: {deal_title}\n"
                "Sector: {sector}\n"
                "Parties: {parties}\n"
                "Risk Level: {risk_level}\n"
                "Bottlenecks: {bottlenecks}\n"
                "Additional Context: {context}\n"
                "User Notes: {user_context}\n\n"
                "Draft a follow-up email. Use the format:\n"
                "SUBJECT: ...\n---FIELD---\n"
                "RECIPIENT: ...\n---FIELD---\n"
                "BODY: ..."
            )),
        ])

        chain = prompt | llm
        result = chain.invoke({
            "deal_id": request.deal_id,
            "deal_title": request.deal_title or "",
            "sector": request.sector or "",
            "parties": request.parties or "",
            "risk_level": request.risk_level or "Medium",
            "bottlenecks": bottleneck_text,
            "context": context_text,
            "user_context": request.context or "",
        })

        # Parse the LLM output
        raw = result.content if hasattr(result, "content") else str(result)
        parts = raw.split("---FIELD---")

        subject = "Follow-up: " + (request.deal_title or request.deal_id)
        recipient = "Deal Counterparty"
        body = raw

        if len(parts) >= 3:
            subject_part = parts[0].strip()
            recipient_part = parts[1].strip()
            body_part = parts[2].strip()
            subject = subject_part.replace("SUBJECT:", "").strip()
            recipient = recipient_part.replace("RECIPIENT:", "").strip()
            body = body_part.replace("BODY:", "").strip()
        elif len(parts) == 1:
            # Try line-based parsing as fallback
            lines = raw.strip().split("\n")
            for line in lines:
                if line.strip().upper().startswith("SUBJECT:"):
                    subject = line.split(":", 1)[1].strip()
                elif line.strip().upper().startswith("RECIPIENT:"):
                    recipient = line.split(":", 1)[1].strip()

            # Body is everything after the headers
            body_start = raw.find("BODY:")
            if body_start != -1:
                body = raw[body_start + 5:].strip()

        thread_id = f"draft_{request.deal_id}_{uuid.uuid4().hex[:8]}"

        print(f"✅ Draft generated: {subject[:50]}...")

        return DraftFollowupResponse(
            deal_id=request.deal_id,
            subject=subject,
            body=body,
            recipient=recipient,
            thread_id=thread_id,
        )

    except Exception as e:
        print(f"\n❌ Error in /api/draft-followup: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Draft generation failed: {str(e)}")


# ── POST /api/approve-draft ──────────────────────────────────────────
@app.post("/api/approve-draft", response_model=ApproveDraftResponse)
async def approve_draft(request: ApproveDraftRequest):
    """
    Gatekeeper HITL: approve an email draft and persist it.
    Stores the approved draft in Qdrant as a sent communication.
    """
    try:
        print(f"\n✉️  Draft Approval:")
        print(f"   Deal ID: {request.deal_id}")
        print(f"   Action: {request.action}")
        print(f"   Recipient: {request.recipient}")

        # Store the approved draft in Qdrant as a sent communication
        qdrant_service.upsert_text(
            text=f"[EMAIL SENT] Subject: {request.subject}\nTo: {request.recipient}\n\n{request.body}",
            metadata={
                "deal_id": request.deal_id,
                "type": "sent_email",
                "recipient": request.recipient,
                "subject": request.subject,
                "thread_id": request.thread_id,
                "action": request.action,
            },
        )

        print(f"✅ Draft approved and stored for deal {request.deal_id}")

        return ApproveDraftResponse(
            deal_id=request.deal_id,
            status="sent",
            message=f"Email draft approved and sent to {request.recipient}",
        )

    except Exception as e:
        print(f"\n❌ Error in /api/approve-draft: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Draft approval failed: {str(e)}")


# ═══════════════════════════════════════════════════════════════════════════
# Entrypoint
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8005)
