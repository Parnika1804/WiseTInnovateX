markdown# EventFlow API Documentation

**Base URL:** `http://localhost:8000`

---

## Roster

### POST /roster/upload
Upload participant CSV file.

**Request:** multipart/form-data — upload a `.csv` file with these columns:
name,email,skill,background,institution
Alice,alice@example.com,ML,Engineering,IIT Delhi
Bob,bob@example.com,Backend,Computer Science,IIT Bombay
Charlie,charlie@example.com,Frontend,Design,NIT Trichy

**Response:**
```json
{
  "message": "3 participants uploaded successfully"
}
```

---

### GET /roster
Get all participants.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Alice",
    "email": "alice@example.com",
    "skill": "ML",
    "background": "Engineering",
    "institution": "IIT Delhi"
  }
]
```

---

## Teams

### POST /teams/configure
Save team formation rules.

**Request:**
```json
{
  "team_size": 2,
  "skill_balance": true,
  "constraints": null
}
```

**Response:**
```json
{
  "message": "Team configuration saved",
  "config": {
    "team_size": 2,
    "skill_balance": true,
    "constraints": null
  }
}
```

---

### POST /teams/generate
Generate teams based on rules.

**Request:**
```json
{
  "team_size": 2,
  "skill_balance": true,
  "constraints": null
}
```

**Response:**
```json
{
  "message": "3 teams generated successfully",
  "teams": [
    {
      "id": 1,
      "name": "Team 1",
      "member_ids": [1, 2],
      "rationale": "Grouped based on skill balance. Skills in this team: ML, Backend.",
      "status": "PENDING"
    }
  ]
}
```

---

### POST /teams/approve
Approve or reject a team. Action must be `APPROVED` or `REJECTED`.

**Request:**
```json
{
  "team_id": 1,
  "action": "APPROVED"
}
```

**Response:**
```json
{
  "message": "Team Team 1 has been APPROVED",
  "team_id": 1,
  "status": "APPROVED"
}
```

---

### GET /teams
Get all teams with status.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Team 1",
    "member_ids": [1, 2],
    "rationale": "Grouped based on skill balance. Skills in this team: ML, Backend.",
    "status": "PENDING"
  }
]
```

---

## Pipeline

### GET /pipeline/status
Get current stage and pending items.

**Response:**
```json
{
  "current_stage": "INTAKE",
  "stages": [
    { "order": 1, "name": "INTAKE", "label": "Participant Intake", "description": "Upload and verify participant roster", "status": "ACTIVE" },
    { "order": 2, "name": "TEAM_FORMATION", "label": "Team Formation", "description": "Configure rules, generate teams and get committee approval", "status": "UPCOMING" },
    { "order": 3, "name": "COMMUNICATION", "label": "Communication", "description": "Draft and send communications to participants", "status": "UPCOMING" },
    { "order": 4, "name": "EVALUATION", "label": "Evaluation", "description": "Judges assess teams and submit scores", "status": "UPCOMING" },
    { "order": 5, "name": "RESULTS", "label": "Results", "description": "Consolidate scores and send progression invites", "status": "UPCOMING" }
  ],
  "pending_items": [
    {
      "type": "TEAM_APPROVAL",
      "message": "2 team(s) awaiting committee approval",
      "count": 2
    }
  ]
}
```

---

## Communications

### POST /comms/draft
Save a draft communication.

**Request:**
```json
{
  "recipient_email": "alice@example.com",
  "subject": "Welcome to EventFlow Hackathon",
  "message": "Hi Alice, you have been successfully registered. Your team will be announced soon."
}
```

**Response:**
```json
{
  "message": "Communication drafted successfully",
  "log": {
    "id": 1,
    "recipient_email": "alice@example.com",
    "subject": "Welcome to EventFlow Hackathon",
    "message": "Hi Alice, you have been successfully registered. Your team will be announced soon.",
    "status": "DRAFT",
    "created_at": "2026-05-19T08:09:02.810829"
  }
}
```

---

### POST /comms/send
Send a drafted communication by log id.

**Request:**
```json
{
  "log_id": 1
}
```

**Response:**
```json
{
  "message": "Communication sent successfully to alice@example.com",
  "log": {
    "id": 1,
    "recipient_email": "alice@example.com",
    "subject": "Welcome to EventFlow Hackathon",
    "message": "Hi Alice, you have been successfully registered. Your team will be announced soon.",
    "status": "SENT",
    "sent_at": "2026-05-19T08:10:00.000000"
  }
}
```

---

### GET /comms/log
Get all communications with delivery status.

**Response:**
```json
[
  {
    "id": 1,
    "recipient_email": "alice@example.com",
    "subject": "Welcome to EventFlow Hackathon",
    "message": "Hi Alice, you have been successfully registered. Your team will be announced soon.",
    "status": "SENT",
    "sent_at": "2026-05-19T08:10:00.000000",
    "created_at": "2026-05-19T08:09:02.810829"
  }
]
```

---

## Scores

### POST /scores/submit
Submit a judge score for a team. Score must be between 0 and 10.

**Request:**
```json
{
  "team_id": 1,
  "judge_name": "Judge A",
  "score": 8.5,
  "notes": "Great problem solving approach"
}
```

**Response:**
```json
{
  "message": "Score submitted successfully",
  "score": {
    "id": 1,
    "team_id": 1,
    "judge_name": "Judge A",
    "score": 8.5,
    "notes": "Great problem solving approach",
    "created_at": "2026-05-20T08:00:00.000000"
  }
}
```

---

### GET /scores/leaderboard
Get leaderboard with average scores and breakdown per team.

**Response:**
```json
[
  {
    "team_id": 1,
    "team_name": "Team 1",
    "average_score": 7.75,
    "scores": [
      { "judge_name": "Judge A", "score": 8.5, "notes": "Great problem solving" },
      { "judge_name": "Judge B", "score": 7.0, "notes": "Good but lacks innovation" }
    ]
  }
]
```

---

## Activity Log

### POST /activity/log
Log a system action manually.

**Request params** (query params, not body):
action: "ROSTER_UPLOAD"
description: "3 participants uploaded successfully"
performed_by: "committee"

**Response:**
```json
{
  "message": "Action logged successfully"
}
```

---

### GET /activity
Get all system activity logs in descending order.

**Response:**
```json
[
  {
    "id": 1,
    "action": "ROSTER_UPLOAD",
    "description": "3 participants uploaded successfully",
    "performed_by": "committee",
    "created_at": "2026-05-20T08:00:00.000000"
  }
]
```

---

## Participant Portal

### GET /participant/{participant_id}
Get full status for a single participant — stage, team, evaluator, dates and qualification.

**Request:** Pass participant id in the URL path — e.g. `/participant/1`

**Response:**
```json
{
  "participant": {
    "id": 1,
    "name": "Alice",
    "email": "alice@example.com",
    "skill": "ML",
    "institution": "IIT Delhi"
  },
  "current_stage": {
    "name": "INTAKE",
    "label": "Participant Intake",
    "description": "Upload and verify participant roster"
  },
  "team": {
    "id": 1,
    "name": "Team 1",
    "status": "APPROVED",
    "members": [
      { "id": 1, "name": "Alice", "skill": "ML" },
      { "id": 2, "name": "Bob", "skill": "Backend" }
    ]
  },
  "evaluator": "Judge A",
  "key_dates": {
    "event_start": "2026-06-01",
    "team_announcement": "2026-06-02",
    "evaluation_date": "2026-06-03",
    "results_date": "2026-06-04"
  },
  "progression": {
    "is_qualified": true,
    "message": "Congratulations! You have been invited to the next round."
  }
}
```

---

### GET /participants/portal
Get all participants list for portal overview.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Alice",
    "email": "alice@example.com",
    "skill": "ML",
    "institution": "IIT Delhi"
  }
]
```

---

## Status Reference

| Field | Values |
|---|---|
| Team status | `PENDING` `APPROVED` `REJECTED` |
| Communication status | `DRAFT` `SENT` |
| Pipeline stage status | `ACTIVE` `COMPLETED` `UPCOMING` |
| Qualification | `true` if average score >= 7.0, otherwise `false` |