"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export type LanguageCode = "si" | "ta" | "en";

export interface TranslationMessage {
  id: string;
  source_lang: LanguageCode;
  target_lang: LanguageCode;
  source_text: string;
  translated_text: string;
  timestamp: string;
}

export function useInterpreterSocket(langA: LanguageCode, langB: LanguageCode) {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState<"A" | "B" | null>(null);
  const [messages, setMessages] = useState<TranslationMessage[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const langsRef = useRef({ langA, langB });

  // Keep latest language pair in a ref so reconnects send current values
  useEffect(() => {
    langsRef.current = { langA, langB };
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "config", lang_a: langA, lang_b: langB }));
    }
  }, [langA, langB]);

  // Connect to FastAPI WebSocket with automatic reconnect
  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let isUnmounted = false;

    const connect = () => {
      ws = new WebSocket("ws://127.0.0.1:8000/ws/interpret");
      wsRef.current = ws;

      ws.onopen = () => {
        if (isUnmounted) {
          ws.close();
          return;
        }
        setIsConnected(true);
        ws.send(
          JSON.stringify({
            type: "config",
            lang_a: langsRef.current.langA,
            lang_b: langsRef.current.langB,
          })
        );
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "translation_result") {
          setIsProcessing(false);
          const newMsg: TranslationMessage = {
            id: crypto.randomUUID(),
            source_lang: data.source_lang,
            target_lang: data.target_lang,
            source_text: data.source_text,
            translated_text: data.translated_text,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };
          setMessages((prev) => [...prev, newMsg]);

          // Play back synthesized speech
          if (data.audio_base64) {
            const audio = new Audio(`data:audio/mp3;base64,${data.audio_base64}`);
            setIsSpeaking(true);
            audio.onended = () => setIsSpeaking(false);
            audio.onerror = () => setIsSpeaking(false);
            audio.play().catch((err) => {
              console.error("Audio playback failed:", err);
              setIsSpeaking(false);
            });
          }
        }
      };

      ws.onerror = () => {
        setIsProcessing(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (!isUnmounted) {
          reconnectTimer = setTimeout(connect, 2000);
        }
      };
    };

    connect();

    return () => {
      isUnmounted = true;
      clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, []);

  const startRecording = useCallback(
    async (speaker: "A" | "B") => {
      if (isSpeaking) return; // Prevent recording while TTS is playing (echo guard)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          const arrayBuffer = await audioBlob.arrayBuffer();
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            setIsProcessing(true);
            wsRef.current.send(arrayBuffer);
          }
          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.start();
        setActiveSpeaker(speaker);
        setIsRecording(true);
      } catch (err) {
        console.error("Microphone access denied:", err);
      }
    },
    [isSpeaking]
  );

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setActiveSpeaker(null);
    }
  }, []);

  return {
    isConnected,
    isRecording,
    isProcessing,
    isSpeaking,
    activeSpeaker,
    messages,
    startRecording,
    stopRecording,
  };
}