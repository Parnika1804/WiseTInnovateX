import requests
import os
from dotenv import load_dotenv

load_dotenv(override=True)

GEMINI_KEYS = [
    os.getenv("GEMINI_API_KEY_1"),
    os.getenv("GEMINI_API_KEY_2"),
    os.getenv("GEMINI_API_KEY_3"),
    os.getenv("GEMINI_API_KEY_4")
]
AVAILABLE_KEYS = [key.strip() for key in GEMINI_KEYS if key and key.strip()]

def call_gemini(prompt: str) -> str:
    if not AVAILABLE_KEYS:
        raise ValueError("No valid Gemini API keys found in .env file.")

    for idx, key in enumerate(AVAILABLE_KEYS):
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={key}"
            payload = {
                "contents": [{"parts": [{"text": prompt}]}]
            }
            response = requests.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]
        except Exception as e:
            print(f"Key #{idx + 1} failed: {e}")
            if idx == len(AVAILABLE_KEYS) - 1:
                raise Exception(f"All Gemini API keys failed. Last error: {e}")
            continue