import edge_tts

# Native Sri Lankan & English neural voices
VOICE_MAP = {
    "si": "si-LK-ThiliniNeural",   # Sinhala (Sri Lanka) - Female (or si-LK-SameeraNeural for Male)
    "ta": "ta-LK-SaranyaNeural",   # Tamil (Sri Lanka) - Female (or ta-LK-KumarNeural for Male)
    "en": "en-US-AvaNeural",       # English - Female
}

async def synthesize_speech(text: str, target_lang: str) -> bytes:
    """Converts translated text into MP3 audio bytes using neural TTS."""
    voice = VOICE_MAP.get(target_lang, "en-US-AvaNeural")
    communicate = edge_tts.Communicate(text, voice)
    audio_chunks = bytearray()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_chunks.extend(chunk["data"])
    return bytes(audio_chunks)