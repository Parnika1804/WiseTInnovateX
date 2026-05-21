# EventFlow Phase 2 — Handoff Guide for Incoming Members

## What has already been done

### Phase 1 (fully complete)
- Participant CSV upload and roster display
- Team formation with rules configuration and approval gate
- Hardcoded pipeline stages
- Manual communication drafting and delivery log
- Judge score submission interface
- Leaderboard with score breakdowns
- Activity log
- Participant portal (read only)

### Phase 2 (partially complete — done by previous team)
- Gemini API connected and working via `gemini.py`
- Celery + Redis set up and running via `celery_app.py`
- Three async Celery tasks defined in `tasks.py`
- Anomaly detection logic complete in `scores.py`
- Anomaly indicators on leaderboard complete in `scores.py`
- LLM rationale per team complete in `teams.py`
- LLM drafted communications for two stages complete in `comms.py`
- LLM assessment guide per team complete in `scores.py`

---

## What is left for you to build

### Backend
- Nothing remaining — all backend routes are complete

### Frontend (your main job)
Build these components in React inside the `frontend` folder:

1. Show LLM rationale under each team card — fetches from `GET /teams`
2. Show Gemini drafted message as preview before committee sends — uses `POST /comms/draft/gemini` then `POST /comms/send`
3. Show assessment guide on judge score submission page — fetches from `GET /scores/assessment-guide/{team_id}`
4. Show anomaly flag indicator on leaderboard — fetches from `GET /scores/leaderboard` and checks `has_anomaly`
5. Update participant portal to show progression invite for qualifying teams — fetches from `GET /participant/{participant_id}` and checks `progression.is_qualified`
6. JWT signed links for participant and evaluator access

---

## How to run the project

### Backend
1. Open terminal inside `backend` folder
2. Activate venv — run `venv\Scripts\activate`
3. Run `python main.py`
4. Backend runs on `http://localhost:8000`
5. API docs at `http://localhost:8000/docs`

### Celery worker (required for async Gemini calls)
1. Open a second terminal inside `backend` folder
2. Activate venv — run `venv\Scripts\activate`
3. Run `celery -A celery_app worker --loglevel=info --pool=solo`
4. Keep this terminal running while working

### Redis
- Already installed as a Windows service
- Runs automatically — no action needed

### Frontend
1. Open terminal inside `frontend` folder
2. Run `npm install`
3. Run `npm run dev`
4. Frontend runs on `http://localhost:5173`

---

## Key files to know

| File | What it does |
|---|---|
| `gemini.py` | Gemini API connection — import `call_gemini` to use |
| `celery_app.py` | Celery + Redis setup |
| `tasks.py` | Three async Gemini tasks — `generate_team_rationale`, `draft_communication`, `generate_assessment_guide` |
| `models.py` | All database models — Participant, Team, Score, CommunicationLog, ActivityLog |
| `teams.py` | Team formation routes including LLM rationale |
| `comms.py` | Communication routes including Gemini drafting and preview |
| `scores.py` | Score submission, leaderboard, anomaly detection, assessment guide |
| `participant.py` | Participant portal route |
| `API_DOCS.md` | All routes with request and response examples — read this first |

---

## Gemini API key

- Key is hardcoded in `gemini.py`
- If you get a 429 rate limit error wait 1-2 minutes and retry
- If it keeps failing create a new key at `aistudio.google.com` and replace it in `gemini.py`
- Correct URL being used: `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`

---

## New routes added in Phase 2

| Route | What it does |
|---|---|
| `POST /comms/draft/gemini` | Gemini drafts a communication for TEAM_ASSIGNMENT or EVALUATION_REMINDER stage |
| `GET /scores/assessment-guide/{team_id}` | Gemini generates assessment guide for a team |
| `GET /scores/anomalies` | Returns all flagged anomalous scores |
| `POST /scores/resolve/{score_id}` | Resolves a flagged anomaly |

---

## Important rules

- Never send a team announcement or results without committee approval
- Anomaly detection threshold is set to `2.0` in `scores.py` — change `ANOMALY_THRESHOLD` to adjust
- All Gemini calls are async via Celery — always keep the Celery worker running
- The `tasks.py` file has all three Gemini tasks ready — you can call them directly if needed

---

## First thing to do when you start

1. Pull latest from `dev` — run `git pull origin dev`
2. Read `API_DOCS.md` fully
3. Start backend — `python main.py`
4. Start Celery worker
5. Start frontend — `npm run dev`
6. Confirm everything runs before writing any code