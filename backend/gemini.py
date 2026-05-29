import requests
import os

GEMINI_API_KEY = "AIzaSyAb3GMoJPMM7HOKk7pi3X9XlkbrzgXEFRY"



# Switched to the universally available 'gemini-pro' model
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"

def call_gemini(prompt: str) -> str:
    try:
        payload = {
            "contents": [{"parts": [{"text": prompt}]}]
        }
        response = requests.post(GEMINI_URL, json=payload)
        
        # If it fails, print the EXACT reason from Google
        if response.status_code != 200:
            print(f"❌ Google API Rejected Request: {response.status_code}")
            print(f"❌ Reason: {response.text}")
            
        response.raise_for_status()
        data = response.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]
        
    except Exception as e:
        print(f"Gemini API error: {e}")
        return "Gemini API call failed"