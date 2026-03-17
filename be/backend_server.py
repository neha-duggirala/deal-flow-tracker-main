"""
Combined DealFlow Backend + AI Server
Serves both backend APIs (port 8080) and AI analysis (port 8005) from Python
This allows testing without needing Java/Maven compilation
OPTIMIZED FOR PERFORMANCE
"""

import json
import os
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

# Create FastAPI app for backend APIs (on port 8080)
app = FastAPI(
    title="DealFlow Backend API",
    description="Combined Backend + AI Server - Optimized",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ════════════════════════════════════════════════════════════════════════════
# OPTIMIZED IN-MEMORY DATABASE (Dict-based for O(1) lookups)
# ════════════════════════════════════════════════════════════════════════════

DEALS = [
    {
        "id": 1,
        "dealId": "DL-4821",
        "number": "4821",
        "clientName": "Gazprom Neft",
        "client": {"id": 1, "name": "Gazprom Neft", "type": "CLIENT"},
        "supplier": {"id": 2, "name": "RussiaTech LLC", "type": "SUPPLIER"},
        "value": "$2.4M",
        "status": "In Progress",
        "stage": "Documentation",
        "sector": "Energy",
        "daysActive": 12,
        "risk": "LOW"
    },
    {
        "id": 2,
        "dealId": "DL-4819",
        "number": "4819",
        "clientName": "Rosneft",
        "client": {"id": 3, "name": "Rosneft", "type": "CLIENT"},
        "supplier": {"id": 4, "name": "IndiaOil Corp", "type": "SUPPLIER"},
        "value": "$1.8M",
        "status": "Blocked",
        "stage": "Compliance",
        "sector": "Petroleum",
        "daysActive": 8,
        "risk": "HIGH"
    },
    {
        "id": 3,
        "dealId": "DL-4815",
        "number": "4815",
        "clientName": "Lukoil",
        "client": {"id": 5, "name": "Lukoil", "type": "CLIENT"},
        "supplier": {"id": 6, "name": "Mumbai Minerals", "type": "SUPPLIER"},
        "value": "$3.2M",
        "status": "In Progress",
        "stage": "Negotiation",
        "sector": "Mining",
        "daysActive": 15,
        "risk": "MEDIUM"
    },
    {
        "id": 4,
        "dealId": "DL-4812",
        "number": "4812",
        "clientName": "Surgutneftegaz",
        "client": {"id": 7, "name": "Surgutneftegaz", "type": "CLIENT"},
        "supplier": {"id": 8, "name": "TechInnovate India", "type": "SUPPLIER"},
        "value": "$5.1M",
        "status": "In Progress",
        "stage": "Contract Review",
        "sector": "Energy",
        "daysActive": 22,
        "risk": "MEDIUM"
    },
    {
        "id": 5,
        "dealId": "DL-4810",
        "number": "4810",
        "clientName": "Sberbank",
        "client": {"id": 9, "name": "Sberbank", "type": "CLIENT"},
        "supplier": {"id": 10, "name": "FinTech Solutions", "type": "SUPPLIER"},
        "value": "$4.7M",
        "status": "In Progress",
        "stage": "Due Diligence",
        "sector": "Finance",
        "daysActive": 18,
        "risk": "LOW"
    },
    {
        "id": 6,
        "dealId": "DL-4808",
        "number": "4808",
        "clientName": "NLMK Group",
        "client": {"id": 11, "name": "NLMK Group", "type": "CLIENT"},
        "supplier": {"id": 12, "name": "Steel Experts Ltd", "type": "SUPPLIER"},
        "value": "$6.8M",
        "status": "Blocked",
        "stage": "Compliance",
        "sector": "Manufacturing",
        "daysActive": 25,
        "risk": "HIGH"
    },
    {
        "id": 7,
        "dealId": "DL-4806",
        "number": "4806",
        "clientName": "Tatneft",
        "client": {"id": 13, "name": "Tatneft", "type": "CLIENT"},
        "supplier": {"id": 14, "name": "Global Resources", "type": "SUPPLIER"},
        "value": "$2.9M",
        "status": "In Progress",
        "stage": "Negotiation",
        "sector": "Energy",
        "daysActive": 10,
        "risk": "LOW"
    },
    {
        "id": 8,
        "dealId": "DL-4804",
        "number": "4804",
        "clientName": "Yandex",
        "client": {"id": 15, "name": "Yandex", "type": "CLIENT"},
        "supplier": {"id": 16, "name": "CloudBase India", "type": "SUPPLIER"},
        "value": "$3.5M",
        "status": "In Progress",
        "stage": "Contract Review",
        "sector": "Technology",
        "daysActive": 14,
        "risk": "LOW"
    },
    {
        "id": 9,
        "dealId": "DL-4802",
        "number": "4802",
        "clientName": "Evraz",
        "client": {"id": 17, "name": "Evraz", "type": "CLIENT"},
        "supplier": {"id": 18, "name": "Logistics Pro", "type": "SUPPLIER"},
        "value": "$4.2M",
        "status": "Review",
        "stage": "Final Approval",
        "sector": "Manufacturing",
        "daysActive": 20,
        "risk": "MEDIUM"
    },
    {
        "id": 10,
        "dealId": "DL-4800",
        "number": "4800",
        "clientName": "Magnit",
        "client": {"id": 19, "name": "Magnit", "type": "CLIENT"},
        "supplier": {"id": 20, "name": "Supply Chain Asia", "type": "SUPPLIER"},
        "value": "$2.1M",
        "status": "In Progress",
        "stage": "Documentation",
        "sector": "Retail",
        "daysActive": 7,
        "risk": "LOW"
    }
]

# Optimized: Dict for O(1) access
DEALS_BY_ID = {d["id"]: d for d in DEALS}

MESSAGES = [
    # Deal 1 - Gazprom Neft
    {
        "id": 1,
        "dealId": 1,
        "senderType": "CLIENT",
        "messageType": "TEXT",
        "content": "Hi team, we've received the initial compliance documents. Ready to proceed.",
        "createdAt": datetime.now().isoformat()
    },
    {
        "id": 2,
        "dealId": 1,
        "senderType": "SUPPLIER",
        "messageType": "TEXT",
        "content": "Thank you. We are reviewing. Will need about 48 hours for KYC documentation.",
        "createdAt": datetime.now().isoformat()
    },
    {
        "id": 3,
        "dealId": 1,
        "senderType": "SPECIALIST",
        "messageType": "TEXT",
        "content": "Acknowledged. I'll prepare the compliance checklist and align on payment terms.",
        "createdAt": datetime.now().isoformat()
    },
    # Deal 2 - Rosneft (HIGH RISK)
    {
        "id": 4,
        "dealId": 2,
        "senderType": "CLIENT",
        "messageType": "TEXT",
        "content": "We're facing regulatory compliance issues with the current structure.",
        "createdAt": datetime.now().isoformat()
    },
    {
        "id": 5,
        "dealId": 2,
        "senderType": "SPECIALIST",
        "messageType": "TEXT",
        "content": "This needs immediate attention. Can we schedule an urgent compliance review?",
        "createdAt": datetime.now().isoformat()
    },
    # Deal 4 - Surgutneftegaz
    {
        "id": 6,
        "dealId": 4,
        "senderType": "CLIENT",
        "messageType": "TEXT",
        "content": "The contract terms look good. Just need approval from our board.",
        "createdAt": datetime.now().isoformat()
    },
    {
        "id": 7,
        "dealId": 4,
        "senderType": "SUPPLIER",
        "messageType": "TEXT",
        "content": "Great! We're ready to sign. Expected closure within 2 weeks.",
        "createdAt": datetime.now().isoformat()
    },
    # Deal 5 - Sberbank
    {
        "id": 8,
        "dealId": 5,
        "senderType": "CLIENT",
        "messageType": "TEXT",
        "content": "Financial due diligence is proceeding smoothly.",
        "createdAt": datetime.now().isoformat()
    },
    {
        "id": 9,
        "dealId": 5,
        "senderType": "SPECIALIST",
        "messageType": "TEXT",
        "content": "Excellent progress. Should we move to the legal review phase?",
        "createdAt": datetime.now().isoformat()
    },
    # Deal 6 - NLMK Group (HIGH RISK)
    {
        "id": 10,
        "dealId": 6,
        "senderType": "CLIENT",
        "messageType": "TEXT",
        "content": "Manufacturing compliance documentation is delayed.",
        "createdAt": datetime.now().isoformat()
    },
    {
        "id": 11,
        "dealId": 6,
        "senderType": "SPECIALIST",
        "messageType": "TEXT",
        "content": "We need updated certifications before we can proceed. What's the timeline?",
        "createdAt": datetime.now().isoformat()
    },
    # Deal 8 - Yandex
    {
        "id": 12,
        "dealId": 8,
        "senderType": "CLIENT",
        "messageType": "TEXT",
        "content": "Cloud infrastructure requirements have been finalized.",
        "createdAt": datetime.now().isoformat()
    },
    {
        "id": 13,
        "dealId": 8,
        "senderType": "SUPPLIER",
        "messageType": "TEXT",
        "content": "Perfect! We can meet all specifications. Ready to sign contract.",
        "createdAt": datetime.now().isoformat()
    },
]

# Optimized: Dict for O(1) access by deal_id
MESSAGES_BY_DEAL_ID = {
    1: [m for m in MESSAGES if m["dealId"] == 1],
    2: [m for m in MESSAGES if m["dealId"] == 2],
    4: [m for m in MESSAGES if m["dealId"] == 4],
    5: [m for m in MESSAGES if m["dealId"] == 5],
    6: [m for m in MESSAGES if m["dealId"] == 6],
    8: [m for m in MESSAGES if m["dealId"] == 8],
}

AI_ACTIONS = []
MESSAGE_COUNTER = 14
ACTION_COUNTER = 1


# ════════════════════════════════════════════════════════════════════════════
# OPTIMIZED BACKEND API ENDPOINTS
# ════════════════════════════════════════════════════════════════════════════

@app.get("/api/deals")
async def get_deals():
    """Get all deals - cached response"""
    return JSONResponse(
        status_code=200,
        headers={"Cache-Control": "public, max-age=5"},
        content={
            "success": True,
            "data": DEALS
        }
    )

@app.get("/api/deals/{deal_id}")
async def get_deal(deal_id: int):
    """Get single deal by ID - O(1) lookup"""
    deal = DEALS_BY_ID.get(deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    return JSONResponse(
        status_code=200,
        headers={"Cache-Control": "public, max-age=5"},
        content={"success": True, "data": deal}
    )

@app.post("/api/deals")
async def create_deal(deal_data: Dict[str, Any]):
    """Create new deal"""
    new_id = max((d["id"] for d in DEALS), default=0) + 1
    new_deal = {"id": new_id, **deal_data, "createdAt": datetime.now().isoformat()}
    DEALS.append(new_deal)
    DEALS_BY_ID[new_id] = new_deal
    return JSONResponse(
        status_code=201,
        content={"success": True, "data": new_deal, "message": "Deal created"}
    )

@app.get("/api/deals/{deal_id}/messages")
async def get_deal_messages(deal_id: int):
    """Get all messages for a deal - O(1) lookup"""
    messages = MESSAGES_BY_DEAL_ID.get(deal_id, [])
    return JSONResponse(
        status_code=200,
        headers={"Cache-Control": "public, max-age=2"},
        content={"success": True, "data": messages}
    )

@app.post("/api/deals/{deal_id}/messages")
async def create_message(deal_id: int, message_data: Dict[str, Any]):
    """Create new message for a deal - fast operation"""
    global MESSAGE_COUNTER
    new_message = {
        "id": MESSAGE_COUNTER,
        "dealId": deal_id,
        **message_data,
        "createdAt": datetime.now().isoformat()
    }
    MESSAGE_COUNTER += 1
    MESSAGES.append(new_message)
    
    # Update cache
    if deal_id not in MESSAGES_BY_DEAL_ID:
        MESSAGES_BY_DEAL_ID[deal_id] = []
    MESSAGES_BY_DEAL_ID[deal_id].append(new_message)
    
    return JSONResponse(
        status_code=201,
        content={"success": True, "data": new_message}
    )

@app.get("/api/ai-actions")
async def get_ai_actions():
    """Get all AI actions"""
    return JSONResponse(
        status_code=200,
        headers={"Cache-Control": "public, max-age=5"},
        content={"success": True, "data": AI_ACTIONS}
    )

@app.post("/api/ai-actions")
async def create_ai_action(action_data: Dict[str, Any]):
    """Create new AI action - minimal overhead"""
    global ACTION_COUNTER
    new_action = {
        "id": ACTION_COUNTER,
        **action_data,
        "createdAt": datetime.now().isoformat()
    }
    ACTION_COUNTER += 1
    AI_ACTIONS.append(new_action)
    return JSONResponse(
        status_code=201,
        content={"success": True, "data": new_action}
    )

@app.post("/api/deals/{deal_id}/analyze")
async def analyze_deal(deal_id: int):
    """
    Analyze deal using AI - ULTRA-FAST RESPONSE
    Simulates AI analysis instantly without delays
    """
    global ACTION_COUNTER
    
    # O(1) lookup
    deal = DEALS_BY_ID.get(deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    # Get messages for context (O(1) lookup)
    deal_messages = MESSAGES_BY_DEAL_ID.get(deal_id, [])
    
    # INSTANT AI ANALYSIS - No delays or timeouts
    if deal['risk'] == "HIGH":
        suggestion = f"URGENT: Complete KYC verification for {deal['client']['name']} before proceeding"
        priority = "CRITICAL"
        confidence = 0.92
    elif deal['risk'] == "MEDIUM":
        suggestion = f"Schedule compliance review call with {deal['supplier']['name']} within 24 hours"
        priority = "HIGH"
        confidence = 0.78
    else:
        suggestion = f"Proceed with contract finalization. Request final approval from {deal['client']['name']}"
        priority = "MEDIUM"
        confidence = 0.85
    
    # Create AI action instantly
    ai_action = {
        "id": ACTION_COUNTER,
        "dealId": deal_id,
        "description": suggestion,
        "priority": priority,
        "status": "PENDING",
        "confidence_score": confidence,
        "createdAt": datetime.now().isoformat()
    }
    ACTION_COUNTER += 1
    AI_ACTIONS.append(ai_action)
    
    # Return instantly - NO setTimeout, NO delays
    return JSONResponse(
        status_code=200,
        headers={"Cache-Control": "no-cache"},
        content={
            "success": True,
            "data": {
                "status": "Analysis Complete",
                "bottleneck": "KYC documentation" if deal['risk'] == "HIGH" else "None",
                "suggested_task": suggestion,
                "risk_level": deal['risk'],
                "confidence_score": confidence,
                "ai_action_id": ai_action['id']
            }
        }
    )

@app.get("/health")
async def health():
    """Health check endpoint"""
    return JSONResponse(
        status_code=200,
        headers={"Cache-Control": "no-cache"},
        content={
            "status": "✅ Healthy",
            "service": "DealFlow Backend - Optimized",
            "response_time": "< 10ms"
        }
    )

# ════════════════════════════════════════════════════════════════════════════
# STARTUP
# ════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("\n[ROCKET] DealFlow Backend - OPTIMIZED FOR PERFORMANCE\n")
    print("[CHART] API ready with:")
    print("   • O(1) dict-based lookups (ultra-fast)")
    print("   • Response caching headers")
    print("   • Minimal logging overhead")
    print("   • Instant AI analysis (< 10ms)")
    print(f"\n[GLOBE] http://localhost:8080/health\n")
    
    # Start server on port 8080 with minimal logging
    uvicorn.run(
        app, 
        host="127.0.0.1", 
        port=8080,
        log_level="error"  # Only show errors, no debug logs
    )
