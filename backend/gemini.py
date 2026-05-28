import requests
import os

GEMINI_API_KEY = ""

GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={GEMINI_API_KEY}"

def call_gemini(prompt: str) -> str:
    try:
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt}
                    ]
                }
            ]
        }
        response = requests.post(GEMINI_URL, json=payload)
        response.raise_for_status()
        data = response.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except Exception as e:
        print(f"Gemini API error: {e}")
        return "Gemini API call failed"

if __name__ == "__main__":
    test_prompt = "Say hello and confirm which Gemini model you are in one sentence."
    result = call_gemini(test_prompt)
    print("Gemini response:", result)