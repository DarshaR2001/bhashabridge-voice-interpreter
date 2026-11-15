# 🎙️ BhashaBridge AI — Tri-Lingual Real-Time Voice Interpreter

**BhashaBridge AI** is a real-time, bi-directional voice-to-voice translation platform supporting **Sinhala (`si-LK`)**, **Tamil (`ta-LK`)**, and **English (`en`)**. Built for face-to-face conversations, it combines Voice Activity Detection (VAD), Speech-to-Text, context-aware translation, and Neural Text-to-Speech over low-latency WebSockets.

## ✨ Key Features
- **Two-Way Voice Turn-Taking:** Hands-free speech detection powered by Silero VAD with automatic echo cancellation during playback.
- **Direct 6-Way Translation:** Supports `Sinhala ↔ English`, `Tamil ↔ English`, and direct `Sinhala ↔ Tamil` translation.
- **Colloquial Dialect Awareness:** Tuned for natural spoken Sri Lankan phrasing and Singlish/Tanglish code-switching.
- **Dual-Script Live Captions:** Displays both source transcription and translated script in real time.

## 🏗️ Architecture
`Microphone (16kHz PCM)` ➔ `WebSocket` ➔ `Silero VAD` ➔ `STT` ➔ `Translation` ➔ `Neural TTS` ➔ `Speaker Playback`

## 🚀 Quick Start
1. **Clone the repository:**
   
```bash
   git clone [https://github.com/](https://github.com/)<your-username>/bhashabridge-voice-interpreter.git
   cd bhashabridge-voice-interpreter