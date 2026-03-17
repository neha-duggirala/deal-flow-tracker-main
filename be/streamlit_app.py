import streamlit as st
import requests
import json
from pathlib import Path

# Page config
st.set_page_config(
    page_title="SberBank DealFlow Assistant",
    page_icon="🤖",
    layout="wide",
)

# Constants
API_BASE_URL = "http://localhost:8005"
DATA_PATH = Path("data/synthetic_data.json")

# Helper Functions
def fetch_deals():
    if not DATA_PATH.exists():
        st.error("Synthetic data file not found.")
        return []
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def run_analysis(deal_id, messages, sector, parties):
    payload = {
        "deal_id": deal_id,
        "messages": messages,
        "sector": sector,
        "parties": parties
    }
    response = requests.post(f"{API_BASE_URL}/api/analyze", json=payload)
    response.raise_for_status()
    return response.json()

def submit_review(thread_id, action, edited_task=None):
    payload = {
        "thread_id": thread_id,
        "action": action,
        "edited_task": edited_task
    }
    response = requests.post(f"{API_BASE_URL}/api/review", json=payload)
    response.raise_for_status()
    return response.json()

def ingest_data():
    response = requests.post(f"{API_BASE_URL}/api/deals/ingest-all")
    response.raise_for_status()
    return response.json()

# --- UI Layout ---

# Sidebar
with st.sidebar:
    st.image("https://upload.wikimedia.org/wikipedia/commons/4/4c/Sberbank_logo_2020.svg", width=150)
    st.title("Settings & Data")
    
    if st.button("🚀 Ingest All Synthetic Data", use_container_width=True):
        with st.spinner("Ingesting into Qdrant..."):
            try:
                res = ingest_data()
                st.success(f"Successfully ingested {res['total_points_created']} messages!")
            except Exception as e:
                st.error(f"Ingestion failed: {e}")

    st.divider()
    
    deals = fetch_deals()
    deal_ids = [d["deal_id"] for d in deals]
    selected_deal_id = st.selectbox("Select a Deal for Analysis", ["Custom"] + deal_ids)

# Main Area
st.title("SberBank India–Russia DealFlow Assistant")
st.markdown("Automated multi-agent analysis for trade finance and logistics bottlenecks.")

if selected_deal_id != "Custom":
    deal_data = next(d for d in deals if d["deal_id"] == selected_deal_id)
    
    col1, col2 = st.columns([1, 1])
    
    with col1:
        st.subheader("Deal Context")
        st.info(f"**ID:** {deal_data['deal_id']}\n\n**Sector:** {deal_data['sector']}\n\n**Parties:** {deal_data['parties']['client']} ↔ {deal_data['parties']['supplier']}")
        
        st.subheader("Communication History")
        for msg in deal_data["communication_history"]:
            with st.chat_message(msg["sender"].lower()):
                st.markdown(f"**{msg['sender'].capitalize()}** ({msg['timestamp']})")
                st.write(msg["content"])
    
    with col2:
        st.subheader("AI Analysis")
        if st.button("🔍 Run Analysis", use_container_width=True):
            with st.spinner("Agents are collaborating..."):
                try:
                    formatted_messages = [
                        {
                            "sender": m["sender"],
                            "content": m["content"],
                            "timestamp": m["timestamp"],
                            "type": m["type"]
                        } for m in deal_data["communication_history"]
                    ]
                    
                    analysis = run_analysis(
                        deal_id=deal_data["deal_id"],
                        messages=formatted_messages,
                        sector=deal_data["sector"],
                        parties=f"{deal_data['parties']['client']} ↔ {deal_data['parties']['supplier']}"
                    )
                    
                    st.session_state["latest_analysis"] = analysis
                except Exception as e:
                    st.error(f"Analysis failed: {e}")

        if "latest_analysis" in st.session_state:
            res = st.session_state["latest_analysis"]
            
            # Status & Risk
            sc1, sc2 = st.columns(2)
            with sc1:
                color = "red" if res["status"] == "Blocked" else "orange" if res["status"] == "Action Needed" else "green"
                st.markdown(f"**Status:** :{color}[{res['status']}]")
            with sc2:
                risk_color = "red" if res["risk_level"] == "High" else "orange" if res["risk_level"] == "Medium" else "green"
                st.markdown(f"**Risk Level:** :{risk_color}[{res['risk_level']}]")
            
            st.markdown(f"**Bottlenecks Detected:** {res['bottleneck']}")
            
            # Fingerprints
            st.write("**Semantic Fingerprints:**")
            st.write(" ".join([f"`{tags}`" for tags in res["fingerprints"]]))
            
            st.divider()
            
            st.subheader("💡 Recommended Action")
            st.write(f"**Task:** {res['suggested_task']}")
            
            if res["suggested_draft"]:
                with st.expander("📄 View Message Draft"):
                    st.code(res["suggested_draft"])
            
            st.divider()
            
            # HITL Section
            if res["requires_review"]:
                st.warning("⚠️ **Gatekeeper:** Analysis requires Specialist Review (Confidence: {:.0%})".format(res["confidence_score"]))
                
                with st.form("review_form"):
                    edited_task = st.text_area("Review/Edit Recommended Task", value=res["suggested_task"])
                    fcol1, fcol2 = st.columns(2)
                    with fcol1:
                        approve = st.form_submit_button("✅ Approve & Log Task", use_container_width=True)
                    with fcol2:
                        reject = st.form_submit_button("❌ Reject (Retry Strategy)", use_container_width=True)
                
                if approve:
                    with st.spinner("Finalizing task..."):
                        review_res = submit_review(res["thread_id"], "approve", edited_task)
                        st.success(f"Task finalized and logged to Qdrant!")
                        st.balloons()
                if reject:
                    with st.spinner("Retrying analysis..."):
                        review_res = submit_review(res["thread_id"], "reject")
                        st.info("Strategy rejected. Rerunning Strategist node...")
            else:
                st.success("✅ **Gatekeeper:** Task auto-approved and logged (Confidence: {:.0%})".format(res["confidence_score"]))

else:
    st.info("Select a deal from the sidebar to begin analysis or use a custom input.")
    # Add custom input fields here if needed in the future
