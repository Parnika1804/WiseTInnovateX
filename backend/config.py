PIPELINE_STAGES = [
    {
        "order": 1,
        "name": "INTAKE",
        "label": "Participant Intake",
        "description": "Upload and verify participant roster"
    },
    {
        "order": 2,
        "name": "TEAM_FORMATION",
        "label": "Team Formation",
        "description": "Configure rules, generate teams and get committee approval"
    },
    {
        "order": 3,
        "name": "COMMUNICATION",
        "label": "Communication",
        "description": "Draft and send communications to participants"
    },
    {
        "order": 4,
        "name": "EVALUATION",
        "label": "Evaluation",
        "description": "Judges assess teams and submit scores"
    },
    {
        "order": 5,
        "name": "RESULTS",
        "label": "Results",
        "description": "Consolidate scores and send progression invites"
    }
]

CURRENT_STAGE = "INTAKE"