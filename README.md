# EventFlow Orchestrator

AI-powered event management platform for hackathons and innovation challenges.

Developed as part of the **WiseTInnovateX** project.

---

## Features

### Event Setup

* AI-assisted event configuration from natural language descriptions
* Multi-round event pipeline generation
* Advancement criteria management

### Participant Management

* CSV participant roster upload
* Automated participant onboarding
* Team assignment workflows

### AI Team Formation

* Describe team formation rules in plain English
* AI converts requirements into structured rubrics
* Editable JSON-based rubric validation
* Automatic team generation

### Communication Hub

* AI-generated announcements
* Bulk email broadcasting
* Team-specific messaging
* Judge invitation workflows
* Magic-link authentication

### Evaluation System

* Judge dashboard
* Multi-round scoring
* Advancement approvals
* Leaderboards and rankings

### Monitoring & Operations

* Pending approvals center
* Real-time activity logs
* Dashboard notifications
* Celery-powered background task processing

---

# Technology Stack

## Frontend

* React
* Vite
* Tailwind CSS
* Framer Motion
* Axios

## Backend

* FastAPI
* SQLAlchemy
* Pydantic

## Background Processing

* Celery
* Redis

## AI Services

* Google Gemini (Pro / Flash)
* Groq API (supplementary generation)

---

# Local Development Setup

## Terminal 1 — Redis

```bash
docker run -p 6379:6379 redis
```

or

```bash
redis-server
```

---

## Terminal 2 — Celery Worker

```bash
cd WiseTInnovateX/backend

venv\Scripts\activate

celery -A celery_app worker --loglevel=info --pool=solo
```

---

## Terminal 3 — Backend Server

```bash
cd WiseTInnovateX/backend

venv\Scripts\activate

python main.py
```

Backend runs at:

```text
http://localhost:8000
```

Swagger documentation:

```text
http://localhost:8000/docs
```

---

## Terminal 4 — Frontend

```bash
cd WiseTInnovateX/frontend

npm install

npm run dev
```

Frontend runs at:

```text
http://localhost:5173
```

---

# Environment Variables

Create a `.env` file inside `backend/`.

Required variables:

```env
GEMINI_API_KEY_1=
GEMINI_API_KEY_2=
GEMINI_API_KEY_3=
GEMINI_API_KEY_4=

GROQ_API_KEY=

SMTP_HOST=
SMTP_PORT=

SMTP_USER=
SMTP_PASSWORD=

FROM_EMAIL=
FROM_NAME=
```

---

# Smoke Test Checklist

* [ ] Redis starts successfully
* [ ] Celery worker connects without errors
* [ ] Backend launches successfully
* [ ] Frontend loads without console errors
* [ ] API documentation is accessible
* [ ] Participant CSV upload works
* [ ] Welcome emails are generated
* [ ] Teams can be formed successfully
* [ ] Judge invitations are sent
* [ ] Activity log updates correctly

---

# Project Structure

```text
WiseTInnovateX/
├── backend/
├── frontend/
├── README.md
└── docs/
```

---

# Future Improvements

* Docker Compose setup
* Role-based analytics dashboards
* Real-time WebSocket notifications
* AI-generated evaluation feedback
* Deployment to cloud infrastructure

---

## Authors

Developed for the WiseTInnovateX initiative.

EventFlow Orchestrator © 2026
