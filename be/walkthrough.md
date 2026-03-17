# DealFlow Multi-Agent System Walkthrough

I have completed the LangGraph multi-agent system, integrated it with Qdrant Cloud, and exposed it via a FastAPI server. The system is designed to analyze trade deal communications between India and Russia, identify financial/regulatory bottlenecks, and suggest actionable tasks for Sberbank specialists.

## Key Accomplishments

### 1. Multi-Agent LangGraph
Re-implemented `graph.py` with a robust 5-agent architecture:
- **Scribe Node**: Embeds and persists every message to Qdrant Cloud for long-term memory.
- **Analyst Node**: Performs deep analysis using retrieved context to identify bottlenecks and risk levels.
- **Strategist Node**: Proposes high-quality tasks and draft communications with a confidence score.
- **Gatekeeper Node**: Handles Human-in-the-Loop (HITL). It auto-approves high-confidence low-risk tasks and pauses (`interrupt`) for specialist review on complex cases.
- **Executor Node**: Logs finalized/approved actions back to the vector DB.

### 2. Qdrant Cloud Integration
Created a centralized [qdrant_service.py](file:///d:/Neha/AI/SberBank/Hackathon/multi_agent/qdrant_service.py) that handles:
- Automatic collection creation and keyword indexing for `deal_id`.
- Filtered similarity search (context retrieval scoped to specific deals).
- Persistent storage of the trade's semantic state.

### 3. FastAPI REST Layer
The server at [main.py](file:///d:/Neha/AI/SberBank/Hackathon/multi_agent/main.py) runs on port **8005** and exposes:

- `POST /api/analyze`: Full graph execution (backward-compatible with existing Java models).
- `POST /api/review`: Resumes a paused thread after a specialist approves/edits a task.
- `GET /api/deals/{id}/status`: Polls the current state of an ongoing graph execution.
- `POST /api/deals/ingest-all`: Seeds the vector DB with communications from `synthetic_data.json`.

## Verification Results

### API Analysis Test
Successfully ran a test analysis for deal `SBER-IND-RU-2026-005` with context retrieval enabled.

**Request:**
```json
{
  "deal_id": "SBER-IND-RU-2026-005",
  "messages": [{"sender": "supplier", "content": "We need to clear the LC discounting bottleneck"}]
}
```

**Response (Verified):**
```json
{
  "status": "Blocked",
  "bottleneck": "LC discounting; Letter of credit discounting delay",
  "suggested_task": "Coordinate with the Sberbank Trade Finance team to expedite LC discounting for Northern Steel LLC.",
  "risk_level": "High",
  "confidence_score": 0.9,
  "fingerprints": ["LC discounting", "working capital", "INR settlement", "eBRC"],
  "requires_review": true,
  "thread_id": "SBER-IND-RU-2026-005_cec90414"
}
```

## How to Run
1. Start the server:
   ```bash
   cd d:\Neha\AI\SberBank\Hackathon\multi_agent
   python main.py
   ```
2. The server will run at `http://localhost:8005`.
3. Exploratory UI (Swagger) is available at `http://localhost:8005/docs`.
