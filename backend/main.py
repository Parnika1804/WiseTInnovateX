from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from database import init_db
from roster import router as roster_router
from teams import router as teams_router
from pipeline import router as pipeline_router
from comms import router as comms_router
from scores import router as scores_router
from activity import router as activity_router
from participant import router as participant_router
import uvicorn
from event_description import router as event_description_router
from dynamic_pipeline import router as dynamic_pipeline_router
from clarification import router as clarification_router
from auth import router as auth_router
from mentors import router as mentors_router
from special_mention import router as special_mention_router
from feedback import router as feedback_router 
from websocket_manager import manager # NEW
from sqlalchemy import text
from database import engine

# --- NEW IMPORTS FOR AI CHAT (GROQ) ---
from pydantic import BaseModel
from dotenv import load_dotenv
from groq import Groq
import os

# Load the variables from the .env file
load_dotenv()

# Initialize Groq client
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Define what the React frontend will send
class ChatRequest(BaseModel):
    system_prompt: str
    message: str
# -------------------------------

def run_migrations():
    with engine.connect() as conn:
        try:
            conn.execute(text('ALTER TABLE teams ADD COLUMN is_special_mention BOOLEAN DEFAULT 0'))
            conn.commit()
        except:
            pass  # Column already exists

run_migrations()

app = FastAPI(title="EventFlow API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

app.include_router(roster_router)
app.include_router(teams_router)
app.include_router(pipeline_router)
app.include_router(comms_router)
app.include_router(scores_router)
app.include_router(activity_router)
app.include_router(participant_router)
app.include_router(event_description_router)
app.include_router(dynamic_pipeline_router)
app.include_router(clarification_router)
app.include_router(auth_router)
app.include_router(mentors_router)
app.include_router(special_mention_router)
app.include_router(feedback_router) 

@app.get("/")
def root():
    return {"message": "EventFlow API is running"}

# --- NEW: AI Chat Endpoint (GROQ) ---
@app.post("/ai/chat")
async def support_chat(request: ChatRequest):
    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": request.system_prompt,
                },
                {
                    "role": "user",
                    "content": request.message,
                }
            ],
            model="llama-3.1-8b-instant", 
            temperature=0.5,
            max_tokens=500,
        )
        
        return {"reply": chat_completion.choices[0].message.content}
    
    except Exception as e:
        print(f"Groq Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to connect to AI assistant.")
# -----------------------------

# NEW: Global WebSocket router endpoint
@app.websocket("/ws/{channel}")
async def websocket_endpoint(ws: WebSocket, channel: str):
    await manager.connect(ws, channel)
    try:
        while True:
            # Simple heartbeat receive loop to keep connection alive
            _ = await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(ws, channel)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, reload_delay=0.1)