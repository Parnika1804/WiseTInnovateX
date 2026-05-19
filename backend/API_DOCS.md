Here is your API_DOCS.md — single copy paste:
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

## Status Reference

| Field | Values |
|---|---|
| Team status | `PENDING` `APPROVED` `REJECTED` |
| Communication status | `DRAFT` `SENT` |
| Pipeline stage status | `ACTIVE` `COMPLETED` `UPCOMING` |