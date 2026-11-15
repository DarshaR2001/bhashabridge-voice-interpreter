import os
import json
import time
from pydantic import BaseModel
from google import genai
from google.genai import types
from google.genai.errors import ServerError

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

MODEL_FALLBACK_CHAIN = [
    "gemini-3.5-flash-lite",
    "gemini-3.6-flash",
    "gemini-3.8-flash",
]

class TranscriptionResult(BaseModel):
    detected_lang: str  # "si", "ta", or "en"
    transcript: str

def transcribe_audio(audio_bytes: bytes, mime_type: str = "audio/webm") -> dict:
    """Transcribes audio and detects whether Sinhala ('si'), Tamil ('ta'), or English ('en') was spoken."""
    prompt = (
        "Listen to this audio. Identify the primary spoken language ('si' for Sinhala, 'ta' for Tamil, or 'en' for English) "
        "and transcribe the exact words spoken in their native script (Sinhala script, Tamil script, or Latin script). "
        "Do not translate."
    )

    last_error = None
    for model_name in MODEL_FALLBACK_CHAIN:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=[
                    types.Part.from_bytes(data=audio_bytes, mime_type=mime_type),
                    prompt,
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=TranscriptionResult,
                ),
            )
            return json.loads(response.text)
        except ServerError as e:
            last_error = e
            time.sleep(0.3)

    raise RuntimeError(f"STT failed across all models: {last_error}")