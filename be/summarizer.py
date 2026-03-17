from typing import List, Dict
from langchain_core.prompts import ChatPromptTemplate
from brain import LLM
from config import *
from models import DealAnalysis

def summary_generation(communications: List[Dict]):
    """
    Summarizes communications and generates semantic fingerprints 
    of the deal's progress using the interchangeable LLM class.
    """

    llm_factory = LLM(provider=MODEL_NAME)
    model = llm_factory.get_model()
    structured_llm = model.with_structured_output(DealAnalysis)

    # 2. Prepare the text data from the communication history
    formatted_convo = "\n".join([
        f"Sender: {msg['sender']} | Content: {msg['content']}" 
        for msg in communications
    ])

    # 3. Define the Prompt Template
    prompt = ChatPromptTemplate.from_messages([
        ("system", (
            '''You are an expert trade analyst. Summarize the following deal communications 
            and provide 'semantic fingerprints' (key thematic tags) reflecting the 
            current progress or blockers of the deal.'''
        )),
        ("user", "Analyze these communications:\n\n{convo}")
    ])

    # 4. Create a simple chain
    chain = prompt | structured_llm

    # 5. Execute
    print("--- Processing Communications ---")
    result = chain.invoke({"convo": formatted_convo})
    
    print("\n[Analysis Result]:")
    print(result)
    return result
    
if __name__ == "__main__":
    deal_data =  {
    "deal_id": "IND-RUS-2026-0042",
    "sector": "Pharmaceuticals",
    "parties": {
      "client": "MedCorp Moscow (Russian Federation)",
      "supplier": "BioPharma Mumbai (India)",
      "specialist": "A. Sharma (BD India)"
    },
    "status": "Blocked",
    "bottleneck": "Rupee-Ruble settlement rate disagreement",
    "action_items": [
      "Schedule rate negotiation call; propose Sberbank hedging product FX-Option-B."
    ],
    "communication_history": [
      {
        "timestamp": "2026-03-14T09:15:00Z",
        "sender": "supplier",
        "type": "email",
        "content": "We cannot proceed with the shipment until the currency conversion rate for the INR payment is locked in at the rate discussed last week."
      },
      {
        "timestamp": "2026-03-14T11:30:00Z",
        "sender": "client",
        "type": "email",
        "content": "The central bank rates fluctuated. We need Sberbank to step in and provide a hedging option to finalize this tranche."
      }
    ]
  }
    summary_generation(deal_data["communication_history"])