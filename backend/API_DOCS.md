Here is your updated API_DOCS.md — single copy paste:
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
Save team formation rules manually.

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
Generate teams. Reads team size from dynamic event config if available, otherwise uses manual config.

**Request:** (optional — leave empty if dynamic config is active)
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
  "config_source": "dynamic",
  "teams": [
    {
      "id": 1,
      "name": "Team 1",
      "member_ids": [1, 2],
      "rationale": "Gemini generated rationale here",
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
    "rationale": "Gemini generated rationale here",
    "status": "PENDING"
  }
]
```

---

## Pipeline

### GET /pipeline/status
Get hardcoded pipeline stage and pending items.

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
  "pending_items": []
}
```

---

### GET /pipeline/dynamic/status
Get dynamic pipeline stages from active event config stored in DB.

**Response:**
```json
{
  "event_name": "Unknown",
  "current_stage": "ROUND_1",
  "stages": [
    { "order": 1, "name": "ROUND_1", "label": "Round 1", "description": "First round of the coding contest", "status": "ACTIVE" },
    { "order": 2, "name": "ROUND_2", "label": "Round 2", "description": "Second round of the coding contest", "status": "UPCOMING" },
    { "order": 3, "name": "ROUND_3", "label": "Round 3", "description": "Third and final round of the coding contest", "status": "UPCOMING" }
  ],
  "team_formation": {
    "team_size": 4,
    "skill_balance": false,
    "constraints": null
  },
  "scoring": {
    "max_score": 100,
    "scoring_criteria": "Judges score out of 100",
    "advancement_rule": "Top 10 teams advance to the next round"
  }
}
```

---

## Communications

### POST /comms/draft
Save a manual draft communication.

**Request:**
```json
{
  "recipient_email": "alice@example.com",
  "subject": "Welcome to EventFlow Hackathon",
  "message": "Hi Alice, you have been successfully registered."
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
    "message": "Hi Alice, you have been successfully registered.",
    "status": "DRAFT",
    "created_at": "2026-05-19T08:09:02.810829"
  }
}
```

---

### POST /comms/draft/gemini
Gemini drafts a communication for a specific stage. Stage must be `TEAM_ASSIGNMENT` or `EVALUATION_REMINDER`.

**Request:**
```json
{
  "stage": "TEAM_ASSIGNMENT",
  "team_id": 1,
  "recipient_email": "alice@example.com"
}
```

**Response:**
```json
{
  "message": "Gemini drafted communication ready for preview",
  "preview": {
    "id": 1,
    "recipient_email": "alice@example.com",
    "subject": "Your Team Assignment — Team 1",
    "message": "Gemini drafted message here",
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
    "message": "Hi Alice, you have been successfully registered.",
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
    "message": "Hi Alice, you have been successfully registered.",
    "status": "SENT",
    "sent_at": "2026-05-19T08:10:00.000000",
    "created_at": "2026-05-19T08:09:02.810829"
  }
]
```

---

## Scores

### GET /scores/assessment-guide/{team_id}
Get Gemini generated assessment guide for a team. Reads scoring config from active event config.

**Request:** Pass team id in URL — e.g. `/scores/assessment-guide/1`

**Response:**
```json
{
  "team_id": 1,
  "team_name": "Team 1",
  "members": ["Alice", "Bob"],
  "skills": ["ML", "Backend"],
  "max_score": 100,
  "scoring_criteria": "Judges score out of 100",
  "advancement_rule": "Top 10 teams advance to the next round",
  "assessment_guide": "Gemini generated guide here"
}
```

---

### POST /scores/submit
Submit a judge score for a team. Max score is read from active event config.

**Request:**
```json
{
  "team_id": 1,
  "judge_name": "Judge A",
  "score": 85,
  "notes": "Excellent work"
}
```

**Response:**
```json
{
  "message": "Score submitted successfully",
  "max_score": 100,
  "score": {
    "id": 1,
    "team_id": 1,
    "judge_name": "Judge A",
    "score": 85,
    "notes": "Excellent work",
    "anomaly_flagged": false,
    "created_at": "2026-05-20T08:00:00.000000"
  }
}
```

---

### GET /scores/leaderboard
Get leaderboard with average scores. Reads max score and advancement rule from active event config.

**Response:**
```json
[
  {
    "team_id": 1,
    "team_name": "Team 1",
    "average_score": 85.0,
    "max_score": 100,
    "has_anomaly": false,
    "results_on_hold": false,
    "advancement_rule": "Top 10 teams advance to the next round",
    "scores": [
      { "judge_name": "Judge A", "score": 85, "notes": "Excellent work", "anomaly_flagged": false }
    ]
  }
]
```

---

### GET /scores/anomalies
Get all flagged anomalous scores.

**Response:**
```json
{
  "message": "1 anomaly(s) detected",
  "anomalies": [
    {
      "id": 2,
      "team_id": 1,
      "judge_name": "Judge B",
      "score": 3.0,
      "notes": "Poor execution",
      "created_at": "2026-05-20T08:00:00.000000"
    }
  ]
}
```

---

### POST /scores/resolve/{score_id}
Resolve a flagged anomaly.

**Request:** Pass score id in URL — e.g. `/scores/resolve/2`

**Response:**
```json
{
  "message": "Anomaly resolved for score id 2",
  "score_id": 2,
  "anomaly_flagged": false
}
```

---

## Activity Log

### POST /activity/log
Log a system action manually.

**Request params** (query params):
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
Get full status for a single participant.

**Request:** Pass participant id in URL — e.g. `/participant/1`

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

## Dynamic Event Configuration

### POST /event/describe
Submit event description and check if it is complete.

**Request:**
```json
{
  "description": "We are running a 3 round coding contest with team size 4, judges score out of 100, top 10 teams advance"
}
```

**Response (complete):**
```json
{
  "status": "complete",
  "message": "Event description parsed successfully",
  "config": {
    "event_name": "Unknown",
    "stages": [...],
    "team_formation": { "team_size": 4, "skill_balance": false, "constraints": null },
    "scoring": { "max_score": 100, "scoring_criteria": "Judges score out of 100", "advancement_rule": "top 10 advance" },
    "communication_touchpoints": [...],
    "approval_requirements": [...],
    "is_complete": true,
    "missing_fields": []
  }
}
```

**Response (incomplete):**
```json
{
  "status": "incomplete",
  "message": "Event description is missing some critical information",
  "missing_fields": ["stages", "team_size", "scoring max_score"],
  "parsed_so_far": {}
}
```

---

### POST /event/configure
Parse description and save event config to DB. Deactivates any previous config.

**Request:**
```json
{
  "description": "We are running a 3 round coding contest with team size 4, judges score out of 100, top 10 teams advance to the next round. Committee must approve teams before announcement. Send welcome email at start and results email at end."
}
```

**Response:**
```json
{
  "status": "saved",
  "message": "Event config saved successfully for Unknown",
  "config_id": 1,
  "config": { ... }
}
```

---

### GET /event/config
Get the currently active event config.

**Response:**
```json
{
  "status": "found",
  "config": {
    "id": 1,
    "event_name": "Unknown",
    "stages": [...],
    "team_formation": { "team_size": 4, "skill_balance": false, "constraints": null },
    "scoring": { "max_score": 100, "scoring_criteria": "Judges score out of 100", "advancement_rule": "Top 10 teams advance" },
    "communication_touchpoints": [...],
    "approval_requirements": [...],
    "created_at": "2026-05-23T17:04:21.563415"
  }
}
```

---

### POST /event/clarify
Get Gemini generated follow-up questions for incomplete description.

**Request:**
```json
{
  "description": "We are running a hackathon with some teams",
  "missing_fields": ["stages", "team_size", "scoring max_score"]
}
```

**Response:**
```json
{
  "status": "clarification_needed",
  "message": "Please answer the following questions to complete your event setup",
  "questions": [
    { "field": "stages", "question": "How many rounds or stages does your event have?" },
    { "field": "team_size", "question": "How many members should each team have?" },
    { "field": "scoring max_score", "question": "What is the maximum score a team can receive?" }
  ]
}
```

---

### POST /event/clarify/resubmit
Combine original description with clarification answers into one description.

**Request:**
```json
{
  "original_description": "We are running a hackathon with some teams",
  "answers": {
    "stages": "3 rounds - qualifying, semi final, final",
    "team_size": "4 members per team",
    "scoring max_score": "100 points total"
  }
}
```

**Response:**
```json
{
  "status": "ready",
  "message": "Description updated with your answers. Please resubmit to POST /event/configure",
  "combined_description": "We are running a hackathon with some teams\n\nAdditional details:\n- stages: 3 rounds - qualifying, semi final, final\n- team_size: 4 members per team\n- scoring max_score: 100 points total\n"
}
```

---

## Status Reference

| Field | Values |
|---|---|
| Team status | `PENDING` `APPROVED` `REJECTED` |
| Communication status | `DRAFT` `SENT` |
| Pipeline stage status | `ACTIVE` `COMPLETED` `UPCOMING` |
| Qualification | `true` if average score >= 70% of max score, otherwise `false` |
| Config source | `dynamic` if event config exists, `manual` if manually provided |
| Event config status | `found` `not_found` `not_configured` |
| Clarification status | `clarification_needed` |
| Description status | `complete` `incomplete` `received` |