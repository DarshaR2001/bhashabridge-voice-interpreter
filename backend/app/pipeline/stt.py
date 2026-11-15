import os
from google import genai
from google.genai import types

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def transcribe_audio(audio_bytes: bytes, mime_type: str = "audio/wav") -> str:
    """Transcribes Sinhala, Tamil, or English audio in its original script."""
    prompt = (
        "Transcribe this audio accurately in its original script "
        "(Sinhala script for Sinhala, Tamil script for Tamil, or Latin script for English). "
        "Do not translate it. Return ONLY the exact spoken text."
    )
    response = client.models.generate_content(
        model="gemini-3.8-flash",
        contents=[
            types.Part.from_bytes(data=audio_bytes, mime_type=mime_type),
            prompt,
        ],
        config=types.GenerateContentConfig(
            thinking_config=types.ThinkingConfig(thinking_level="low")
        ),
    )
    return response.text.strip()