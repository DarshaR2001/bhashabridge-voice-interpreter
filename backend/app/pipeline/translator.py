import os
import time
from google import genai
from google.genai import types
from google.genai.errors import ServerError

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

LANGUAGE_NAMES = {
    "si": "spoken Sri Lankan Sinhala (in Sinhala Unicode script)",
    "ta": "spoken Sri Lankan Tamil (in Tamil Unicode script)",
    "en": "natural conversational English",
}

# Ordered by lowest latency and availability for real-time translation
MODEL_FALLBACK_CHAIN = [
    "gemini-3.5-flash-lite",
    "gemini-3.6-flash",
    "gemini-3.8-flash",
]

def translate_text(text: str, source_lang: str, target_lang: str) -> str:
    """Translates text into natural conversational phrasing with automatic 503 model fallback."""
    if source_lang == target_lang or not text.strip():
        return text

    target_desc = LANGUAGE_NAMES.get(target_lang, target_lang)
    prompt = (
        f"You are a real-time Sri Lankan interpreter. Translate the following text into {target_desc}. "
        "Use natural, everyday spoken phrasing (not overly formal literary grammar), "
        "and preserve proper nouns, street names, or English technical terms naturally. "
        f"Output ONLY the translated text without quotes or explanations.\n\nText: {text}"
    )

    last_error = None
    for model_name in MODEL_FALLBACK_CHAIN:
        try:
            # Only pass thinking_config for models that support it (like 3.8-flash)
            config = (
                types.GenerateContentConfig(
                    thinking_config=types.ThinkingConfig(thinking_level="low")
                )
                if "3.8" in model_name
                else None
            )

            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=config,
            )
            return response.text.strip()

        except ServerError as e:
            last_error = e
            print(f"[Warning] {model_name} busy (503). Switching to fallback model...")
            time.sleep(0.3)

    raise RuntimeError(f"All translation models are currently unavailable: {last_error}")