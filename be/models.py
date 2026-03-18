"""
Pydantic models for:
  1. LLM structured output (DealAnalysis, BottleneckAnalysis, StrategyOutput)
  2. FastAPI request / response schemas
"""

from typing import List, Optional, Union, Dict, Any
from pydantic import BaseModel, Field, field_validator


# ═══════════════════════════════════════════════════════════════════════════
# LLM Structured Output Models
# ═══════════════════════════════════════════════════════════════════════════

class DealAnalysis(BaseModel):
    """Structured analysis output from the Analyst node."""
    summary: str = Field(description="A concise summary of the latest communications.")
    fingerprints: List[str] = Field(
        description="Semantic tags representing deal state (e.g., 'CurrencyRisk', 'RegulatoryHold')."
    )
    risk_level: str = Field(description="Low, Medium, or High risk assessment.")
    recommended_action: str = Field(
        description="The immediate next step to resolve the bottleneck."
    )


class BottleneckAnalysis(BaseModel):
    """Bottleneck analysis output from the Analyst node with risk assessment and bottleneck detection."""
    summary: str = Field(description="Updated summary of the deal including the latest conversation.")
    fingerprints: List[str] = Field(description="Updated semantic tags.")
    bottleneck_status: str = Field(
        description="Status: 'Active', 'Resolved', or 'New Bottleneck identified'"
    )
    bottlenecks: List[str] = Field(
        default_factory=list,
        description="List of specific bottlenecks identified.",
    )
    resolution_details: Optional[str] = Field(
        default=None,
        description="If resolved, how was it solved? If not, what is the current blocker?",
    )
    risk_level: str = Field(description="Low, Medium, or High risk assessment.")


class StrategyOutput(BaseModel):
    """Strategy recommendation output from the Strategist node."""
    suggested_task: str = Field(
        description="A specific, actionable task for the Sber specialist."
    )
    suggested_draft: str = Field(
        default="",
        description="A draft email or message the specialist can send.",
    )
    confidence_score: float = Field(
        description="Confidence score between 0.0 and 1.0 on the quality of this recommendation."
    )
    rationale: str = Field(
        default="",
        description="Brief reasoning behind the suggestion.",
    )


# ═══════════════════════════════════════════════════════════════════════════
# FastAPI Request / Response Models
# ═══════════════════════════════════════════════════════════════════════════

class CommunicationMessage(BaseModel):
    sender: str
    content: str
    timestamp: Optional[str] = None
    type: Optional[str] = "email"  # email / chat


class AnalyzeRequest(BaseModel):
    deal_id: Optional[str] = "UNKNOWN"
    messages: List[Union[CommunicationMessage, Dict[str, Any]]] = []
    sector: Optional[str] = None
    parties: Optional[str] = None

    @field_validator('messages', mode='before')
    @classmethod
    def validate_messages(cls, v):
        """Convert messages to CommunicationMessage format if needed"""
        if not v:
            return []
        
        result = []
        for msg in v:
            if isinstance(msg, dict):
                # Handle dict messages - may have different field names
                sender = msg.get('sender') or msg.get('name') or 'unknown'
                content = msg.get('content') or msg.get('message') or ''
                result.append(CommunicationMessage(
                    sender=str(sender),
                    content=str(content),
                    timestamp=msg.get('timestamp'),
                    type=msg.get('type', 'email')
                ))
            elif isinstance(msg, CommunicationMessage):
                result.append(msg)
            else:
                # Try to convert to string representation
                result.append(CommunicationMessage(
                    sender='unknown',
                    content=str(msg),
                    type='email'
                ))
        return result


class AnalyzeResponse(BaseModel):
    # ---- backward-compatible with Java DealController ----
    status: str
    bottleneck: str
    suggested_task: str
    suggested_draft: str

    # ---- new enriched fields ----
    risk_level: str = "Medium"
    confidence_score: float = 0.0
    fingerprints: List[str] = []
    requires_review: bool = False
    thread_id: str = ""


class GatekeeperReviewRequest(BaseModel):
    thread_id: str
    action: str = Field(description="'approve', 'reject', or 'edit'")
    edited_task: Optional[str] = None


class GatekeeperReviewResponse(BaseModel):
    final_task: str
    is_finalized: bool
    status: str = "completed"


class GraphStatusResponse(BaseModel):
    deal_id: str
    current_node: str
    is_waiting_for_review: bool = False
    state_snapshot: dict = {}


class IngestResponse(BaseModel):
    deal_id: str
    points_created: int
    message: str


# ═══════════════════════════════════════════════════════════════════════════
# Draft Follow-up Models
# ═══════════════════════════════════════════════════════════════════════════

class DraftFollowupRequest(BaseModel):
    deal_id: str
    sector: Optional[str] = ""
    parties: Optional[str] = ""
    deal_title: Optional[str] = ""
    bottlenecks: List[str] = []
    risk_level: Optional[str] = "Medium"
    context: Optional[str] = ""


class DraftFollowupResponse(BaseModel):
    deal_id: str
    subject: str
    body: str
    recipient: str
    thread_id: str


class ApproveDraftRequest(BaseModel):
    deal_id: str
    thread_id: str
    subject: str
    body: str
    recipient: str
    action: str = Field(description="'approve' or 'edit'")


class ApproveDraftResponse(BaseModel):
    deal_id: str
    status: str
    message: str