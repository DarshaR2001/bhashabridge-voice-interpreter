"use client";

import { useState } from "react";
import { Mic, Square, Volume2, Loader2, ArrowLeftRight } from "lucide-react";
import { useInterpreterSocket, LanguageCode } from "@/hooks/useInterpreterSocket";

const LANGUAGES: { code: LanguageCode; label: string; native: string }[] = [
  { code: "si", label: "Sinhala", native: "සිංහල" },
  { code: "ta", label: "Tamil", native: "தமிழ்" },
  { code: "en", label: "English", native: "English" },
];

export default function Home() {
  const [langA, setLangA] = useState<LanguageCode>("si");
  const [langB, setLangB] = useState<LanguageCode>("ta");

  const {
    isConnected,
    isRecording,
    isProcessing,
    isSpeaking,
    activeSpeaker,
    messages,
    startRecording,
    stopRecording,
  } = useInterpreterSocket(langA, langB);

  const toggleMic = (speaker: "A" | "B") => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording(speaker);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between bg-slate-900/60">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">BhashaBridge AI</h1>
          <p className="text-xs text-slate-400">Real-Time Sinhala • Tamil • English Voice Interpreter</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              isConnected ? "bg-emerald-400 animate-pulse" : "bg-rose-500"
            }`}
          />
          <span className={isConnected ? "text-emerald-400" : "text-rose-400"}>
            {isConnected ? "Backend Connected" : "Disconnected"}
          </span>
        </div>
      </header>

      {/* Live Dual-Script Transcript Feed */}
      <section className="flex-1 max-w-4xl w-full mx-auto p-6 overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl p-6">
            <ArrowLeftRight className="w-8 h-8 mb-3 text-slate-600" />
            <p className="text-sm font-medium text-slate-400">Ready for two-way conversation</p>
            <p className="text-xs mt-1">
              Select languages below and tap either microphone button to speak.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-2"
            >
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="uppercase font-semibold tracking-wider text-indigo-400">
                  {msg.source_lang} → {msg.target_lang}
                </span>
                <span>{msg.timestamp}</span>
              </div>
              <p className="text-sm text-slate-300">{msg.source_text}</p>
              <p className="text-lg font-semibold text-white pt-1 border-t border-slate-800/80">
                {msg.translated_text}
              </p>
            </div>
          ))
        )}

        {/* Status Banner */}
        {(isProcessing || isSpeaking) && (
          <div className="flex items-center justify-center gap-2 text-sm text-indigo-300 bg-indigo-950/50 border border-indigo-800/50 rounded-xl py-3">
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Transcribing & translating...</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 animate-bounce" />
                <span>Speaking translation...</span>
              </>
            )}
          </div>
        )}
      </section>

      {/* Bottom Split-Screen Speaker Controls */}
      <section className="border-t border-slate-800 bg-slate-900/90 p-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Speaker A Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col items-center gap-4">
            <div className="w-full flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Speaker A
              </span>
              <select
                value={langA}
                onChange={(e) => setLangA(e.target.value as LanguageCode)}
                className="bg-slate-900 border border-slate-700 text-sm rounded-lg px-3 py-1.5 text-white focus:outline-none"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label} ({l.native})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => toggleMic("A")}
              disabled={!isConnected || isProcessing || isSpeaking || (isRecording && activeSpeaker === "B")}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg ${
                isRecording && activeSpeaker === "A"
                  ? "bg-rose-600 hover:bg-rose-500 scale-105 ring-4 ring-rose-500/30"
                  : "bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40"
              }`}
            >
              {isRecording && activeSpeaker === "A" ? (
                <Square className="w-8 h-8 text-white" />
              ) : (
                <Mic className="w-8 h-8 text-white" />
              )}
            </button>
            <span className="text-xs text-slate-400">
              {isRecording && activeSpeaker === "A" ? "Tap to Stop & Translate" : "Tap to Speak"}
            </span>
          </div>

          {/* Speaker B Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col items-center gap-4">
            <div className="w-full flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Speaker B
              </span>
              <select
                value={langB}
                onChange={(e) => setLangB(e.target.value as LanguageCode)}
                className="bg-slate-900 border border-slate-700 text-sm rounded-lg px-3 py-1.5 text-white focus:outline-none"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label} ({l.native})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => toggleMic("B")}
              disabled={!isConnected || isProcessing || isSpeaking || (isRecording && activeSpeaker === "A")}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg ${
                isRecording && activeSpeaker === "B"
                  ? "bg-rose-600 hover:bg-rose-500 scale-105 ring-4 ring-rose-500/30"
                  : "bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40"
              }`}
            >
              {isRecording && activeSpeaker === "B" ? (
                <Square className="w-8 h-8 text-white" />
              ) : (
                <Mic className="w-8 h-8 text-white" />
              )}
            </button>
            <span className="text-xs text-slate-400">
              {isRecording && activeSpeaker === "B" ? "Tap to Stop & Translate" : "Tap to Speak"}
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}