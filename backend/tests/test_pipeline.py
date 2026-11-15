import asyncio
from dotenv import load_dotenv
load_dotenv()

from backend.app.pipeline.stt import transcribe_audio
from backend.app.pipeline.translator import translate_text
from backend.app.pipeline.tts import synthesize_speech

async def main():
    # Test text-to-translation-to-speech first (Sinhala -> Tamil)
    sample_sinhala = "ආයුබෝවන්, ඔයාට කොහොමද? මට කොළඹ කොටුවට යන්න ඕනේ."
    print(f"Original (SI): {sample_sinhala}")

    translated_tamil = translate_text(sample_sinhala, source_lang="si", target_lang="ta")
    print(f"Translated (TA): {translated_tamil}")

    audio_bytes = await synthesize_speech(translated_tamil, target_lang="ta")
    with open("output_tamil.mp3", "wb") as f:
        f.write(audio_bytes)
    print("Saved output_tamil.mp3! Play it to verify voice quality.")

if __name__ == "__main__":
    asyncio.run(main())