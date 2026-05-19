import os
from fastapi import APIRouter, HTTPException # type: ignore
from pydantic import BaseModel # type: ignore
from groq import Groq # type: ignore
import config

router = APIRouter(prefix="/api/chatbot", tags=["Chatbot"])

class ChatRequest(BaseModel):
    message: str

# Initialize Groq client
client = Groq(
    api_key=config.GROQ_API_KEY,
)

# Define the AI's persona and rules
SYSTEM_PROMPT = """You are the official 'Attendance Support Assistant' for a University Portal. 
Your tone must be helpful, professional, and concise. 
Follow these strict rules:
1. If a student mentions being marked absent or forgetting to log out, tell them to go to the 'Attendance Requests' tab and submit a Manual Correction Request.
2. If a student mentions camera errors or face recognition failing, tell them to inform their lecturer to use the 'Manual Attendances' override feature.
3. If they ask about viewing their attendance percentage, tell them to visit the 'Attendance History' tab.
4. If they ask anything completely unrelated to the university attendance system (like writing code, recipes, or general knowledge), politely decline and state your specific purpose.
Keep your answers under 3 sentences."""

@router.post("/ask")
def chat(payload: ChatRequest):
    user_message = payload.message.strip()
    
    if not user_message:
        return {"reply": "Please type a message so I can help you."}
    
    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message}
            ],
            model="llama-3.1-8b-instant",
            temperature=0.3, # Low temperature for consistent, factual responses
            max_tokens=150
        )
        
        bot_reply = chat_completion.choices[0].message.content
        return {"reply": bot_reply}
        
    except Exception as e:
        print(f"Groq API Error: {e}")
        # Fallback in case of API failure or missing key
        return {"reply": "I'm having trouble connecting to my AI brain right now. Please try again later or contact support directly."}
