# EventFlow Orchestrator: Master Handoff & Dev Guide

## 1. Project Overview

EventFlow is an AI-powered hackathon management platform that automates the full lifecycle—from setup and team formation to communication and precision evaluation.

### Architecture

* **Frontend:** React + Vite (Standardizes portal-based interactions).
* **Backend:** FastAPI (Handles routing and orchestration).
* **Brain:** Google Gemini Pro/Flash (via `google-genai` SDK).
* **Task Queue:** Celery + Redis (Handles long-running AI operations asynchronously).

---

## 2. Environment Setup

### Backend (Python)

1. **Directory:** Navigate to `/backend`.
2. **Virtual Env:** `python -m venv venv` $\rightarrow$ `venv\Scripts\activate`.
3. **Install:** `pip install -r requirements.txt`.
4. **Environment Variables:** Store keys in a `.env` file (never hardcode in production):
* `GEMINI_API_KEY`: Get from [aistudio.google.com](https://aistudio.google.com).
* `SENDGRID_API_KEY`: For production email delivery.



### Celery (Required for AI)

1. **Redis:** Ensure Redis server is active.
2. **Execution:** `celery -A celery_app worker --loglevel=info --pool=solo`.
* *Note: The worker must stay active to process team rationales and email drafts.*



### Frontend (React)

1. **Directory:** Navigate to `/frontend`.
2. **Install:** `npm install`.
3. **Execution:** `npm run dev` (Runs at `wise-t-innovate-290xryk41-tweetdiaries935-8517s-projects.vercel.app`).

---

## 3. Development Roadmap & Key Modules

| Module | Purpose | Key Routes / Logic |
| --- | --- | --- |
| `gemini.py` | AI Wrapper | Centralized `call_gemini` function. |
| `tasks.py` | Celery Tasks | `generate_team_rationale`, `draft_communication`, `generate_assessment_guide`. |
| `models.py` | Database | Participant, Team, Score, Logs. |
| `scores.py` | Evaluation | `GET /scores/leaderboard` (with anomaly flagging), `GET /scores/anomalies`. |
| `comms.py` | Messaging | `POST /comms/draft/gemini` (AI Drafting), `POST /comms/send`. |
| `participant.py` | Portals | `GET /participant/{participant_id}` (Progression logic). |

---

## 4. Phase 2: Feature Implementation Checklist

The following features are now live and should be utilized in all front-end builds:

* **AI Rationale:** Display under team cards via `GET /teams`.
* **AI Comms Drafting:** Use `POST /comms/draft/gemini` to create drafts, followed by `POST /comms/send`.
* **Assessment Guides:** Fetch via `GET /scores/assessment-guide/{team_id}` to provide judges context.
* **Anomaly Detection:** Use `has_anomaly` boolean from `GET /scores/leaderboard` to toggle red warning badges.
* **Progression Logic:** `GET /participant/{participant_id}` now includes `progression` metadata for the portal.
* **Security:** Access is locked via JWT tokens passed as URL parameters (`?token=...`).

---

## 5. Deployment & Operational Rules

1. **Safety First:** Committee approval is required before triggering any `POST /comms/send` request.
2. **Rate Limiting:** If a 429 error occurs, the system defaults to a retry queue via Celery; avoid manual spamming of the Gemini endpoint.
3. **Anomaly Threshold:** Adjust the `ANOMALY_THRESHOLD` constant in `scores.py` to tune the sensitivity of the judge-bias detector.
4. **CORS Policy:** Localhost (`wise-t-innovate-290xryk41-tweetdiaries935-8517s-projects.vercel.app`) is currently white-listed. Ensure the CORS middleware in `main.py` is updated to include your final production domain before deploying to Vercel/Render.

---

## 6. Initial Setup Protocol

Whenever starting a new dev session, verify state in this order:

1. **Sync:** `git pull origin main` (or `dev`).
2. **Backend:** `python main.py` (Verify logs show server startup).
3. **Worker:** Start Celery worker (Verify worker is connected to Redis).
4. **Frontend:** `npm run dev` (Verify no console errors).
5. **Test:** Navigate to `http://localhost:8000/docs` to run a smoke test on the `GET /pipeline/status` route.