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
  const [autoMode, setAutoMode] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState<"A" | "B" | "AUTO" | null>(null);
  const [messages, setMessages] = useState<TranslationMessage[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const langsRef = useRef({ langA, langB });
  const autoModeRef = useRef(autoMode);
  const isSpeakingRef = useRef(isSpeaking);
  const isProcessingRef = useRef(isProcessing);

  // Refs for browser-side Voice Activity Detection (VAD)
  const vadStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    langsRef.current = { langA, langB };
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "config", lang_a: langA, lang_b: langB }));
    }
  }, [langA, langB]);

  useEffect(() => {
    autoModeRef.current = autoMode;
  }, [autoMode]);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    isProcessingRef.current = isProcessing;
  }, [isProcessing]);

  // WebSocket Connection
  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let isUnmounted = false;

    const connect = () => {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://127.0.0.1:8000/ws/interpret";
      ws = new WebSocket(wsUrl);
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

      ws.onerror = () => setIsProcessing(false);

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

  // Manual Recording Controls
  const startRecording = useCallback(
    async (speaker: "A" | "B") => {
      if (isSpeakingRef.current || autoModeRef.current) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
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
    []
  );

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setActiveSpeaker(null);
    }
  }, []);

  // Hands-Free Auto-Listen VAD Loop
  useEffect(() => {
    if (!autoMode) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close();
      if (vadStreamRef.current) vadStreamRef.current.getTracks().forEach((t) => t.stop());
      setIsRecording(false);
      setActiveSpeaker(null);
      return;
    }

    let isCancelled = false;
    let isUtteranceActive = false;
    let silenceStart: number | null = null;
    let utteranceRecorder: MediaRecorder | null = null;
    let utteranceChunks: Blob[] = [];

    const SPEECH_THRESHOLD = 0.035; // Adjust sensitivity if room is noisy
    const SILENCE_DURATION_MS = 1200; // 1.2s pause triggers translation

    const startAutoVAD = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        vadStreamRef.current = stream;

        const audioCtx = new AudioContext();
        audioCtxRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);

        const dataArray = new Float32Array(analyser.fftSize);

        const monitorAudio = () => {
          if (isCancelled) return;

          // Echo Lock: Do not trigger recording while AI is speaking or translating
          if (isSpeakingRef.current || isProcessingRef.current) {
            rafRef.current = requestAnimationFrame(monitorAudio);
            return;
          }

          analyser.getFloatTimeDomainData(dataArray);
          let sumSquares = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sumSquares += dataArray[i] * dataArray[i];
          }
          const rms = Math.sqrt(sumSquares / dataArray.length);

          if (rms > SPEECH_THRESHOLD) {
            silenceStart = null;
            if (!isUtteranceActive) {
              isUtteranceActive = true;
              utteranceChunks = [];
              utteranceRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

              utteranceRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) utteranceChunks.push(e.data);
              };

              utteranceRecorder.onstop = async () => {
                const blob = new Blob(utteranceChunks, { type: "audio/webm" });
                // Ignore accidental micro-clicks under 2KB
                if (blob.size > 2000 && wsRef.current?.readyState === WebSocket.OPEN) {
                  setIsProcessing(true);
                  const buf = await blob.arrayBuffer();
                  wsRef.current.send(buf);
                }
              };

              utteranceRecorder.start();
              setIsRecording(true);
              setActiveSpeaker("AUTO");
            }
          } else if (isUtteranceActive) {
            if (silenceStart === null) {
              silenceStart = Date.now();
            } else if (Date.now() - silenceStart > SILENCE_DURATION_MS) {
              isUtteranceActive = false;
              silenceStart = null;
              setIsRecording(false);
              setActiveSpeaker(null);
              if (utteranceRecorder && utteranceRecorder.state !== "inactive") {
                utteranceRecorder.stop();
              }
            }
          }

          rafRef.current = requestAnimationFrame(monitorAudio);
        };

        monitorAudio();
      } catch (err) {
        console.error("Auto-VAD failed to start:", err);
        setAutoMode(false);
      }
    };

    startAutoVAD();

    return () => {
      isCancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (utteranceRecorder && utteranceRecorder.state !== "inactive") utteranceRecorder.stop();
      if (audioCtxRef.current) audioCtxRef.current.close();
      if (vadStreamRef.current) vadStreamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, [autoMode]);

  return {
    isConnected,
    isRecording,
    isProcessing,
    isSpeaking,
    autoMode,
    setAutoMode,
    activeSpeaker,
    messages,
    startRecording,
    stopRecording,
  };
}