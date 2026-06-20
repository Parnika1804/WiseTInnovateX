# EventFlow Orchestrator

AI-assisted hackathon and event management platform. EventFlow takes an event from raw participant roster all the way to a final podium — handling team formation, mentor assignment, multi-round judging, anomaly detection, and every email in between — with the committee staying in control via an approval gate on every outbound message.

This document describes the **final, shipped state** of the project: what it does, how it's built, and how to run it.

---

## 1. What It Does

**Event setup**
- Describe the event in plain English (or configure it manually) and the AI extracts stages, scoring rubric, and round/advancement rules.
- Round count, max score, and per-round advancement rules (e.g. "Top 50% advance") are configurable at any time before evaluation starts.

**Roster & team formation**
- Bulk-upload participants via CSV.
- AI proposes balanced teams from the roster based on skills/background, with a written rationale per team, generated asynchronously via Celery.
- Committee reviews and approves/rejects/edits proposed teams before anyone is notified.

**Mentors**
- Bulk-upload a mentor roster and auto-assign (or manually assign/reassign) one mentor per team, with an AI-generated rationale for the pairing.
- Mentors get a secure, token-based portal showing their team's live status, round-by-round feedback, and — if their team is eliminated near the end — the ability to nominate one member for a Special Mention wildcard slot in the final round.

**Judging & evaluation**
- Judges access a magic-link portal (no password) to score any approved team per round, with an AI-generated assessment guide for context.
- Scores more than `ANOMALY_THRESHOLD` away from the panel median are automatically flagged for committee review.
- The committee can **Resolve** a flagged score (accept it as-is) or **Reject** it — rejecting deletes the score, recomputes anomalies for that team, and drafts a re-evaluation request to the judge, which (like every other email in the system) waits for committee approval before it's sent.
- Finalizing a round uses the AI to decide who advances per the configured rule, drafts qualified/not-qualified emails to every team member, and — on the last round — drafts the podium results and Special Mention winner announcement.

**Communications — always approval-gated**
- Every automated email the system generates — welcome, team assignment, evaluation reminders, round results, mentor assignment/intro, mentor magic links, anomaly re-evaluation, special mention nomination/decision, feedback requests, final results — is written to a `CommunicationLog` row with `PENDING_APPROVAL` status first.
- Nothing is sent until a committee member approves it (individually or batched by type) from the Comms tab's Action Center. Rejecting discards the draft instead.
- A toast notification ("New email draft(s) are ready for review") fires across the UI whenever a batch of drafts is created, so the committee never has to go looking for pending work.

**Participants**
- A magic-link participant portal shows registration status, team assignment, and round-by-round progression — and lets them submit event feedback after the event concludes.

**Real-time UI**
- Dashboard, leaderboard, and comms views update live over WebSockets whenever the backend broadcasts a relevant event (team approved, score submitted, round finalized, email drafted, etc.) — no manual refreshing required.

---

## 2. Architecture

| Layer | Technology |
| --- | --- |
| Frontend | React 19 + Vite, React Router, Tailwind CSS |
| Backend | FastAPI + SQLAlchemy (SQLite by default) |
| Real-time | Native WebSockets (`/ws/{channel}`) |
| Async jobs | Celery + Redis (team-rationale generation, etc.) |
| AI | Google Gemini 2.0 Flash (REST, multi-key rotation) → Groq Llama 3.1 fallback → deterministic hardcoded fallback |
| Email | SMTP (TLS) via `smtplib`; logs to console if no SMTP credentials are configured |
| Auth | JWT — password login for the Committee role, magic-link tokens (`?token=...`) for Judges, Mentors, and Participants |

### Backend module map

| Module | Responsibility |
| --- | --- |
| `main.py` | App entrypoint, CORS, WebSocket endpoint, AI support-chat endpoint |
| `auth.py` | Committee registration/login, judge creation, JWT issuance |
| `event_description.py`, `dynamic_pipeline.py`, `clarification.py` | AI-assisted event setup, stage/round configuration, dynamic pipeline status |
| `pipeline.py` | Legacy static 5-stage pipeline status/advance (see `config.py`) |
| `roster.py` | Participant CSV upload and roster management |
| `teams.py` | AI team generation, committee approval, manual roster edits |
| `mentors.py` | Mentor upload, auto/manual assignment, intro & magic-link emails |
| `scores.py` | Score submission, anomaly detection/resolution/rejection, round finalization, leaderboard, podium |
| `special_mention.py` | Wildcard nomination, committee approval, approved-list lookup |
| `comms.py` | Draft editing/deletion, AI drafting, approval/rejection (single + batched by type), comms log |
| `email_triggers.py` | All automated email-drafting logic — every path here writes a `PENDING_APPROVAL` draft |
| `email_service.py` | SMTP delivery |
| `feedback.py` | Post-event participant feedback collection and summary |
| `participant.py` | Participant self-service portal data and progression confirmation |
| `activity.py` | Append-only audit log of committee/system actions |
| `websocket_manager.py` | Channel-based WebSocket broadcast manager |
| `gemini.py`, `tasks.py`, `celery_app.py` | AI wrapper with fallback chain; Celery task definitions and worker config |

### Frontend routes

| Path | Access | Purpose |
| --- | --- | --- |
| `/login` | Public | Committee login |
| `/dashboard`, `/setup`, `/teams`, `/comms`, `/evaluation` | Committee only (JWT, role-protected) | Dashboard, event setup, team formation, comms approval center, evaluation/leaderboard |
| `/judge-dashboard` | Magic link | Judge scoring portal |
| `/participant-portal` | Magic link | Participant status & feedback |
| `/mentor-portal` | Magic link | Mentor status, feedback history, Special Mention nomination |
| `/feedback` | Magic link | Standalone post-event feedback form |

---

## 3. Running It Locally

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
python main.py                  # http://localhost:8000  (docs at /docs)
```

Create `backend/.env`:

```env
# AI — at least one Gemini key recommended; Groq is the fallback provider
GEMINI_API_KEY_1=...
GEMINI_API_KEY_2=...            # optional extra keys for rotation
GROQ_API_KEY=...

# Email — leave unset to log emails to the console instead of sending
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yourname@gmail.com
SMTP_PASSWORD=your_16_char_app_password   # Gmail: generate at myaccount.google.com/apppasswords
FROM_EMAIL=yourname@gmail.com
FROM_NAME=EventFlow Team
```

### Celery worker (required for AI team-formation rationale)

```bash
# Redis must be running
cd backend
celery -A celery_app worker --loglevel=info --pool=solo
```

### Frontend

```bash
cd frontend
npm install
npm run dev                     # http://localhost:5173
```

---

## 4. Configuration Notes

- **Anomaly sensitivity** — adjust `ANOMALY_THRESHOLD` in `scores.py` to tune how far a score must deviate from the panel median before it's flagged.
- **Advancement rules** — set per-round via `/event/config/advancement-rules`; the AI applies the rule text when deciding who advances, with a top-50% fallback if it can't parse a clean decision.
- **CORS** — `main.py` currently allows all origins (`allow_origins=["*"]`) for ease of local development. **Lock this down to your real frontend domain before deploying to production.**
- **Database** — SQLite (`eventflow.db`) out of the box; swap the connection string in `database.py` for Postgres/MySQL in production.

---

## 5. API Reference

Full endpoint-by-endpoint documentation (request/response shapes, sample payloads) lives in [`backend/API_DOCS.md`](backend/API_DOCS.md). For a live, interactive view, run the backend and visit `http://localhost:8000/docs`.