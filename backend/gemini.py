import os
from google import genai
from dotenv import load_dotenv

# Force reload of environment variables
load_dotenv(override=True)

# Load keys
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
            # Initialize the new GenAI Client
            client = genai.Client(api_key=key)
            
            # Using the latest model
            response = client.models.generate_content(
                model='gemini-3.5-flash', 
                contents=prompt
            )
            
            return response.text
            
        except Exception as e:
            error_msg = str(e)
            print(f"❌ [GEMINI] Key #{idx + 1} failed: {error_msg}")
            
            # If we've tried all keys, raise the error
            if idx == len(AVAILABLE_KEYS) - 1:
                raise Exception(f"All Gemini API keys failed. Last error: {error_msg}")
            continue