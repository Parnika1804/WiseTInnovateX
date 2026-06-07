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

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

def call_groq(prompt: str) -> str:
    if not GROQ_API_KEY:
        raise ValueError("No Groq API key found in .env file.")
    
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "llama-3.1-8b-instant",
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 1000
    }
    response = requests.post(url, json=payload, headers=headers)
    response.raise_for_status()
    data = response.json()
    return data["choices"][0]["message"]["content"]

def call_gemini(prompt: str) -> str:
    # Try all Gemini keys first
    for idx, key in enumerate(AVAILABLE_KEYS):
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={key}"
            payload = {
                "contents": [{"parts": [{"text": prompt}]}]
            }
            response = requests.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            print(f"✅ Gemini key #{idx + 1} worked")
            return data["candidates"][0]["content"]["parts"][0]["text"]
        except Exception as e:
            print(f"❌ Gemini key #{idx + 1} failed: {e}")
            continue

    # All Gemini keys failed — fall back to Groq
    print("⚠️ All Gemini keys exhausted — falling back to Groq")
    try:
        return call_groq(prompt)
    except Exception as e:
        raise Exception(f"All Gemini keys and Groq failed. Last error: {e}")