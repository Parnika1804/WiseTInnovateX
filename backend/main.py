from fastapi import FastAPI, WebSocket, WebSocketDisconnect
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
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)