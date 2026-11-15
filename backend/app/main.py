import base64
import json
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from backend.app.pipeline.stt import transcribe_audio
from backend.app.pipeline.translator import translate_text
from backend.app.pipeline.tts import synthesize_speech

app = FastAPI(title="BhashaBridge AI Real-Time Interpreter")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "BhashaBridge AI"}

@app.websocket("/ws/interpret")
async def interpret_websocket(websocket: WebSocket):
    await websocket.accept()
    # Default conversation pair: Sinhala <-> Tamil
    session_langs = {"lang_a": "si", "lang_b": "ta"}

    try:
        while True:
            message = await websocket.receive()

            # 1. Handle JSON configuration updates from frontend (e.g., changing languages)
            if "text" in message:
                data = json.loads(message["text"])
                if data.get("type") == "config":
                    session_langs["lang_a"] = data.get("lang_a", "si")
                    session_langs["lang_b"] = data.get("lang_b", "ta")
                    await websocket.send_json({"type": "ack", "config": session_langs})

            # 2. Handle incoming complete speech utterance (binary audio bytes)
            elif "bytes" in message:
                audio_bytes = message["bytes"]

                # Step A: Speech-to-Text + Language Detection (offload sync API call to thread)
                stt_result = await asyncio.to_thread(transcribe_audio, audio_bytes, "audio/webm")
                detected_lang = stt_result.get("detected_lang", session_langs["lang_a"])
                source_text = stt_result.get("transcript", "").strip()

                if not source_text:
                    continue

                # Step B: Route to the opposite speaker's language
                target_lang = (
                    session_langs["lang_b"]
                    if detected_lang == session_langs["lang_a"]
                    else session_langs["lang_a"]
                )

                # Step C: Translate text
                translated_text = await asyncio.to_thread(
                    translate_text, source_text, detected_lang, target_lang
                )

                # Step D: Synthesize target speech
                tts_audio = await synthesize_speech(translated_text, target_lang)
                audio_b64 = base64.b64encode(tts_audio).decode("utf-8")

                # Step E: Send transcripts + audio back to frontend
                await websocket.send_json({
                    "type": "translation_result",
                    "source_lang": detected_lang,
                    "target_lang": target_lang,
                    "source_text": source_text,
                    "translated_text": translated_text,
                    "audio_base64": audio_b64,
                })

    except WebSocketDisconnect:
        print("Client disconnected from interpreter session.")