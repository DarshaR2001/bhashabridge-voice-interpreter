# 🎙️ BhashaBridge AI — Tri-Lingual Real-Time Voice Interpreter

**BhashaBridge AI** is a real-time, bi-directional voice-to-voice translation platform supporting **Sinhala (`si-LK`)**, **Tamil (`ta-LK`)**, and **English (`en`)**. Built for face-to-face conversations, it combines browser-side Voice Activity Detection (VAD), Speech-to-Text with automatic language identification, colloquial Sri Lankan translation, and Neural Text-to-Speech over low-latency WebSockets.

---

## ✨ Key Features

- **Two-Way Voice Turn-Taking:** Supports both **Hands-Free Auto-Listen Mode** (powered by Web Audio API `AnalyserNode` silence detection with automatic echo lock during playback) and manual **Tap-to-Speak** controls.
- **Direct 6-Way Translation:** Seamlessly translates across `Sinhala ↔ English`, `Tamil ↔ English`, and direct `Sinhala ↔ Tamil` with automatic spoken language detection.
- **Colloquial Dialect Awareness:** Tuned for natural, everyday spoken Sri Lankan phrasing and Singlish/Tanglish code-switching rather than stiff literary grammar.
- **Native Neural Voices:** Synthesizes clear Sri Lankan Sinhala (`si-LK-ThiliniNeural`), Sri Lankan Tamil (`ta-LK-SaranyaNeural`), and English (`en-US-AvaNeural`) speech.
- **Dual-Script Live Captions:** Displays both the original recognized script (`සිංහල` / `தமிழ்` / `English`) and the translated script in real time.

---

## 🏗️ System Architecture

```text
Microphone (Web Audio / MediaRecorder)
        │
        ▼  [WebSocket Binary Audio Stream]
FastAPI Backend (/ws/interpret)
        │
        ├──► 1. Speech-to-Text & Language ID (Google GenAI SDK + Fallback Chain)
        ├──► 2. Colloquial 6-Way Translator (Sinhala ↔ Tamil ↔ English)
        └──► 3. Neural Text-to-Speech (edge-tts Sri Lankan Neural Voices)
        │
        ▼  [JSON Transcripts + Base64 MP3 Audio]
Next.js Split-Screen UI (Dual Captions + Echo-Guarded Audio Playback)
```

---

## 🛠️ Tech Stack

- **Frontend:** Next.js 16 (App Router), React, TypeScript, Tailwind CSS, Lucide Icons, Web Audio API
- **Backend:** Python 3.12, FastAPI, Uvicorn, WebSockets, Pydantic
- **AI & Speech Pipeline:** Google GenAI SDK (`gemini-3.5-flash-lite` / `gemini-3.6-flash` / `gemini-3.8-flash` fallback chain), Microsoft Edge Neural TTS (`edge-tts`)
- **DevOps & Deployment:** Docker, Docker Compose

---

## 📂 Project Structure

```text
bhashabridge-voice-interpreter/
├── backend/
│   ├── app/
│   │   ├── main.py                # FastAPI app & /ws/interpret WebSocket server
│   │   └── pipeline/
│   │       ├── stt.py             # Speech-to-Text & automatic language detection
│   │       ├── translator.py      # Colloquial 6-way Sinhala/Tamil/English translator
│   │       └── tts.py             # Neural Text-to-Speech synthesis (si-LK, ta-LK, en)
│   ├── tests/
│   │   └── test_pipeline.py       # End-to-end pipeline verification script
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   └── page.tsx           # Split-screen dual-speaker UI & Auto-Listen toggle
│   │   └── hooks/
│   │       └── useInterpreterSocket.ts  # WebSocket client, MediaRecorder & browser VAD
│   ├── Dockerfile
│   └── package.json
├── docs/
│   └── bhashabridge_development_report.pdf
├── .env.example
├── .gitignore
├── docker-compose.yml
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.11+** and **Node.js 20+** (for local development), or **Docker Desktop**
- A **Google AI Studio API Key** (`GEMINI_API_KEY`)

### 1. Clone & Configure Environment
```bash
git clone [https://github.com/DarshaR2001/bhashabridge-voice-interpreter.git](https://github.com/DarshaR2001/bhashabridge-voice-interpreter.git)
cd bhashabridge-voice-interpreter
```

Create a `.env` file in the root directory:
```env
GEMINI_API_KEY=your_google_ai_studio_api_key_here
```

---

### Option A: Run Locally (Recommended for Low-Overhead Development)

**1. Start the FastAPI Backend:**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
uvicorn backend.app.main:app --reload --port 8000
```

**2. Start the Next.js Frontend (in a second terminal):**
```powershell
cd frontend
npm install
npm run dev
```

Open **`http://localhost:3000`** in Chrome or Edge and allow microphone permissions.

---

### Option B: Run with Docker Compose

```bash
docker compose up --build
```
- **Frontend UI:** `http://localhost:3000`
- **Backend Health Check:** `http://localhost:8000/health`

---
