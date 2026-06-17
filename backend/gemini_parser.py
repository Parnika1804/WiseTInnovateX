import json
from gemini import call_gemini

def parse_event_description(description: str) -> dict:
    prompt = f"""You are an event management AI. A committee has described their event in plain text.
Your job is to extract the structured configuration from this description.

Event Description:
{description}

Return ONLY a valid JSON object with this exact structure. No extra text, no markdown, no backticks, no explanation — just raw JSON:
{{
  "event_name": "extract the exact name of the event from the description. Look for phrases like 'called', 'named', 'event name is'. If not explicitly mentioned, creatively generate a suitable event name based on the description context",
  "stages": [
    {{
      "order": 1,
      "name": "STAGE_NAME — use clean names like 'Registration', 'Team Formation', 'Round 1 - Problem Statement Submission'. Never append the word 'stage' to the name.",
      "label": "Same as name. Clean and concise. e.g. 'Registration', 'Team Formation', 'Round 1 - Problem Statement Submission'.",
      "description": "A specific description of what happens in this stage."
    }}
  ],
  "team_formation": {{
    "team_size": 0,
    "skill_balance": true,
    "constraints": "any constraints mentioned or null"
  }},
  "scoring": {{
    "max_score": 100,
    "scoring_criteria": "description of how scoring works",
    "advancement_rules": [
      {{
        "round": 1,
        "stage_name": "Round 1",
        "rule": "top X% advance"
      }}
    ]
  }},
  "communication_touchpoints": ["list of communication points mentioned"],
  "approval_requirements": ["list of things needing committee approval"],
  "is_complete": true,
  "missing_fields": []
}}

If any critical information is missing set is_complete to false and list missing fields.
Critical fields are: stages, team_size, scoring max_score."""

    try:
        raw_text = call_gemini(prompt)
        print(f"RAW GEMINI RESPONSE: '{raw_text}'")

        clean_text = raw_text.strip()

        if "```" in clean_text:
            clean_text = clean_text.split("```")[1]
            if clean_text.startswith("json"):
                clean_text = clean_text[4:]

        clean_text = clean_text.strip()

        start = clean_text.find("{")
        end = clean_text.rfind("}") + 1
        if start != -1 and end != 0:
            clean_text = clean_text[start:end]

        parsed = json.loads(clean_text)
        return parsed

    except Exception as e:
        print(f"Gemini parser error: {e}")
        print(f"Raw text was: '{raw_text if 'raw_text' in locals() else 'no response'}'")
        return {
            "is_complete": False,
            "missing_fields": ["Unable to parse description"],
            "error": str(e)
        }