import { useState, useRef, useCallback, useEffect } from "react";
import {
  AudioStreamManager,
  SilenceDetector,
} from "../audio/AudioStreamManager";
import {
  ConnectionManager,
  StreamingTranscriptEvent,
} from "../transcription/ConnectionManager";
import { AUDIO_CONFIG } from "../constants/audioConfig";
import {
  isBrowserSupported,
  getMicrophoneStream,
  handleStartRecordingError,
} from "../utils/audioUtils";

export function useAudioRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  const audioManagerRef = useRef<AudioStreamManager | null>(null);
  const connectionManagerRef = useRef<ConnectionManager | null>(null);
  const silenceDetectorRef = useRef<SilenceDetector | null>(null);

  const resetState = useCallback(() => {
    setError(null);
    setDebugInfo(null);
    setCurrentTranscript("");
    setFinalTranscript("");
  }, []);

  const stopRecording = useCallback(() => {
    try {
      silenceDetectorRef.current?.stop();
      audioManagerRef.current?.stop();
      connectionManagerRef.current?.disconnect();

      silenceDetectorRef.current = null;
      audioManagerRef.current = null;
      connectionManagerRef.current = null;

      setIsRecording(false);
      setIsConnecting(false);
      setIsConnected(false);
      setDebugInfo("⏹️ Recording stopped");
    } catch (err) {
      setIsRecording(false);
      setIsConnecting(false);
      setIsConnected(false);
    }
  }, []);

  const handleTranscriptEvent = useCallback(
    (event: StreamingTranscriptEvent) => {
      switch (event.type) {
        case "connected":
          setIsConnected(true);
          setDebugInfo("✅ Connected to AWS Transcribe");
          break;
        case "partial":
          if (event.transcript) {
            setCurrentTranscript(event.transcript);
            setDebugInfo(`🔄 ${event.transcript}`);
          }
          break;
        case "final":
          if (event.transcript) {
            setFinalTranscript((prev) => prev + event.transcript + " ");
            setCurrentTranscript("");
            setDebugInfo(
              `✅ Final: ${event.transcript} (${(
                (event.confidence || 0) * 100
              ).toFixed(1)}%)`
            );
          }
          break;
        case "completed":
          setDebugInfo("🎉 Transcription completed!");
          setTimeout(stopRecording, 100);
          break;
        case "error":
          setError(event.error || "Unknown transcription error");
          setTimeout(stopRecording, 100);
          break;
      }
    },
    [stopRecording]
  );

  const handleSilenceDetected = useCallback(() => {
    setDebugInfo("⏹️ Stopped due to 5 seconds of silence");
    setTimeout(stopRecording, 100);
  }, [stopRecording]);

  const startRecording = useCallback(async () => {
    try {
      resetState();
      setIsConnecting(true);
      setDebugInfo("🔌 Connecting to AWS Transcribe...");

      if (!isBrowserSupported()) {
        throw new Error(
          "Your browser doesn't support microphone access. Please use Chrome, Firefox, or Safari."
        );
      }

      const stream = await getMicrophoneStream();

      connectionManagerRef.current = new ConnectionManager(
        handleTranscriptEvent
      );
      const sessionId = await connectionManagerRef.current.connect();

      audioManagerRef.current = new AudioStreamManager(
        stream,
        sessionId,
        AUDIO_CONFIG
      );

      silenceDetectorRef.current = new SilenceDetector(
        AUDIO_CONFIG,
        handleSilenceDetected,
        setDebugInfo
      );

      await audioManagerRef.current.start(silenceDetectorRef.current);
      silenceDetectorRef.current.start();

      setIsRecording(true);
      setIsConnecting(false);
      setIsConnected(true);
      setDebugInfo("🎙️ Recording started - speak now!");
    } catch (err) {
      const errorMessage = handleStartRecordingError(err);
      setError(errorMessage);
      setIsRecording(false);
      setIsConnecting(false);
      setIsConnected(false);
    }
  }, [resetState, handleTranscriptEvent, handleSilenceDetected]);

  const clearTranscription = useCallback(() => {
    setCurrentTranscript("");
    setFinalTranscript("");
    setError(null);
    setDebugInfo(null);
  }, []);

  useEffect(() => {
    return () => {
      silenceDetectorRef.current?.stop();
      audioManagerRef.current?.stop();
      connectionManagerRef.current?.disconnect();
    };
  }, []);

  return {
    isRecording,
    isConnecting,
    currentTranscript,
    finalTranscript,
    isConnected,
    error,
    debugInfo,
    startRecording,
    stopRecording,
    clearTranscription,
  };
}
