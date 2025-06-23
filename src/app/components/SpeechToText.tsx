"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface StreamingTranscriptEvent {
  type: "connected" | "partial" | "final" | "completed" | "error";
  transcript?: string;
  confidence?: number;
  timestamp?: string;
  message?: string;
  error?: string;
  note?: string;
  audioLevel?: number;
}

export default function SpeechToText() {
  const [isRecording, setIsRecording] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | ScriptProcessorNode | null>(
    null
  );
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // Voice activity detection
  const checkVoiceActivity = useCallback(() => {
    if (!analyserRef.current) return false;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    const average =
      dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
    const threshold = 25;

    console.log(
      `🔊 Audio level: ${average.toFixed(1)} (threshold: ${threshold})`
    );
    return average > threshold;
  }, []);

  const startVoiceActivityDetection = useCallback(() => {
    let silenceStartTime: number | null = null;

    const checkActivity = () => {
      if (!isRecording) return;

      const hasVoice = checkVoiceActivity();

      if (hasVoice) {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        silenceStartTime = null;
        setDebugInfo("🎤 Voice detected - transcribing in real-time...");
      } else {
        if (!silenceStartTime) {
          silenceStartTime = Date.now();
          setDebugInfo("🔇 Silence detected, will stop in 5 seconds...");

          silenceTimerRef.current = setTimeout(() => {
            console.log("⏰ Auto-stopping due to 5 seconds of silence");
            setDebugInfo("⏹️ Stopped recording due to 5 seconds of silence");
            stopRecording();
          }, 5000);
        } else {
          const elapsed = Math.floor((Date.now() - silenceStartTime) / 1000);
          const remaining = 5 - elapsed;
          if (remaining > 0) {
            setDebugInfo(`🔇 Silence... stopping in ${remaining} seconds`);
          }
        }
      }

      if (isRecording) {
        setTimeout(checkActivity, 500);
      }
    };

    checkActivity();
  }, [isRecording, checkVoiceActivity]);

  const startRecording = async () => {
    try {
      setError(null);
      setDebugInfo(null);
      setCurrentTranscript("");
      setFinalTranscript("");

      console.log("🎙️ Starting real-time streaming transcription...");

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          "Your browser doesn't support microphone access. Please use Chrome, Firefox, or Safari."
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });

      streamRef.current = stream;

      // Set up audio context for both voice detection and PCM capture
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      const source = audioContextRef.current.createMediaStreamSource(stream);

      // Analyzer for voice activity detection
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // Start streaming connection and get session ID
      const sessionId = await startStreamingConnection();
      sessionIdRef.current = sessionId;
      console.log("✅ Session ID received:", sessionId);

      // Use ScriptProcessorNode to capture raw PCM audio
      const scriptProcessor = audioContextRef.current.createScriptProcessor(
        4096,
        1,
        1
      );

      scriptProcessor.onaudioprocess = async (event) => {
        if (!sessionIdRef.current) return;

        const inputBuffer = event.inputBuffer;
        const inputData = inputBuffer.getChannelData(0);

        // Convert float32 to int16 PCM
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const sample = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        }

        // Convert to Uint8Array for transmission
        const uint8Data = new Uint8Array(pcmData.buffer);

        console.log("📡 Sending raw PCM audio:", uint8Data.length, "bytes");

        // Send raw PCM data to backend
        try {
          const response = await fetch(
            `/api/transcribe-stream-realtime?session=${sessionIdRef.current}`,
            {
              method: "POST",
              body: uint8Data,
              headers: {
                "Content-Type": "audio/pcm",
              },
            }
          );

          if (!response.ok) {
            console.warn("⚠️ Failed to send PCM chunk:", response.status);
          }
        } catch (error) {
          console.error("❌ Error sending PCM chunk:", error);
        }
      };

      // Connect the audio processing chain
      source.connect(scriptProcessor);
      scriptProcessor.connect(audioContextRef.current.destination);

      // Store the processor for cleanup
      mediaRecorderRef.current = scriptProcessor as any;
      setIsRecording(true);

      // Start voice activity detection
      startVoiceActivityDetection();

      setDebugInfo("🎙️ Recording started - real-time streaming active!");
    } catch (err) {
      console.error("❌ Error starting recording:", err);

      let errorMessage = "Failed to start recording";

      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          errorMessage =
            "Microphone access denied. Please allow microphone access and try again.";
        } else if (err.name === "NotFoundError") {
          errorMessage =
            "No microphone found. Please connect a microphone and try again.";
        } else if (err.name === "NotSupportedError") {
          errorMessage =
            "Your browser doesn't support this feature. Please use Chrome, Firefox, or Safari.";
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
    }
  };

  const startStreamingConnection = async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        console.log("📡 Starting real-time streaming connection...");

        const eventSource = new EventSource("/api/transcribe-stream-realtime", {
          withCredentials: false,
        });
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          console.log("📡 Real-time stream connected");
          setIsConnected(true);
          setDebugInfo("✅ Real-time streaming active");
        };

        eventSource.onmessage = (event) => {
          try {
            const data: StreamingTranscriptEvent = JSON.parse(event.data);

            if (data.type === "connected" && "sessionId" in data) {
              resolve((data as any).sessionId);
            }

            handleTranscriptEvent(data);
          } catch (parseError) {
            console.warn("Failed to parse SSE message:", parseError);
          }
        };

        eventSource.onerror = (error) => {
          console.error("❌ SSE error:", error);
          setError("Streaming connection failed");
          setIsConnected(false);
          reject(error);
        };
      } catch (error) {
        console.error("❌ Failed to start streaming connection:", error);
        reject(error);
      }
    });
  };

  const stopRecording = () => {
    console.log("⏹️ Stopping real-time recording...");

    if (mediaRecorderRef.current && isRecording) {
      // Handle different types of audio processors
      if (mediaRecorderRef.current instanceof ScriptProcessorNode) {
        mediaRecorderRef.current.disconnect();
      } else if (mediaRecorderRef.current instanceof MediaRecorder) {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    }

    sessionIdRef.current = null;
  };

  const handleTranscriptEvent = (event: StreamingTranscriptEvent) => {
    console.log("📨 Received real-time transcript:", event);

    switch (event.type) {
      case "connected":
        setIsConnected(true);
        setDebugInfo("✅ Real-time streaming active");
        break;

      case "partial":
        if (event.transcript) {
          setCurrentTranscript(event.transcript);
          setDebugInfo(`🔄 Live: ${event.transcript}`);
        }
        break;

      case "final":
        if (event.transcript) {
          const newFinalTranscript = finalTranscript + event.transcript + " ";
          setFinalTranscript(newFinalTranscript);
          setCurrentTranscript("");
          setDebugInfo(
            `✅ Final: ${event.transcript} (${(
              (event.confidence || 0) * 100
            ).toFixed(1)}%)`
          );

          console.log(
            `📝 FINAL TRANSCRIPT UPDATE: "${newFinalTranscript.trim()}"`
          );
        }
        break;

      case "completed":
        setIsConnected(false);
        setDebugInfo("🎉 Real-time transcription completed!");
        break;

      case "error":
        if (
          event.error?.includes("AWS") ||
          event.error?.includes("credentials")
        ) {
          setError(
            `AWS Configuration Error: ${event.error}. Please check your .env.local file.`
          );
        } else {
          setError(event.error || "Unknown transcription error");
        }
        setIsConnected(false);
        break;
    }
  };

  const clearTranscription = () => {
    setCurrentTranscript("");
    setFinalTranscript("");
    setError(null);
    setDebugInfo(null);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 bg-white rounded-lg shadow-lg">
      <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 sm:mb-6 text-center text-gray-800">
        Speech to Text
      </h2>

      {/* Status Indicator */}
      <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
          <span className="text-sm sm:text-base font-medium text-gray-700">
            Status:
          </span>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            {isRecording && (
              <div className="flex items-center">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2"></div>
                <span className="text-red-600 font-medium text-sm sm:text-base">
                  Streaming Live
                </span>
              </div>
            )}
            {isConnected && (
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span className="text-green-600 font-medium text-sm sm:text-base">
                  Real-time Active
                </span>
              </div>
            )}
            {!isRecording && !isConnected && (
              <span className="text-gray-500 text-sm sm:text-base">Ready</span>
            )}
          </div>
        </div>

        <div className="mt-2 text-xs sm:text-sm text-green-700 font-medium">
          🚀 AWS Transcribe real-time streaming - speak for live transcription!
        </div>
      </div>

      {/* Recording Controls */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col items-center space-y-4 sm:space-y-6">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isConnected && !isRecording}
            className={`w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-full flex items-center justify-center text-white font-bold text-2xl sm:text-3xl lg:text-4xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 ${
              isRecording
                ? "bg-red-500 hover:bg-red-600 animate-pulse"
                : isConnected
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-500 hover:bg-green-600 active:bg-green-700"
            }`}
          >
            {isRecording ? "⏹" : "🎙️"}
          </button>

          <p className="text-sm sm:text-base text-gray-600 text-center max-w-md">
            {isRecording
              ? "Streaming to AWS Transcribe - speak now!"
              : "Click to start AWS Transcribe streaming"}
          </p>
        </div>
      </div>

      {/* Live Transcription Display */}
      <div className="mb-6 sm:mb-8">
        <div className="min-h-[120px] sm:min-h-[140px] p-4 sm:p-6 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-3 text-base sm:text-lg">
            Live Stream Transcription:
          </h3>

          {finalTranscript && (
            <p className="text-gray-800 mb-3 text-sm sm:text-base leading-relaxed">
              {finalTranscript}
            </p>
          )}

          {currentTranscript && (
            <p className="text-green-600 italic font-medium text-sm sm:text-base leading-relaxed">
              {currentTranscript}
              <span className="animate-pulse">|</span>
            </p>
          )}

          {!finalTranscript && !currentTranscript && (
            <p className="text-gray-400 italic text-sm sm:text-base">
              Start speaking - AWS Transcribe will transcribe in real-time...
            </p>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2 sm:gap-3 mb-4 sm:mb-6">
        <button
          onClick={clearTranscription}
          className="flex-1 py-2 sm:py-3 px-4 bg-gray-500 hover:bg-gray-600 active:bg-gray-700 text-white rounded-lg font-medium text-sm sm:text-base transition-all duration-200 hover:shadow-md"
        >
          🗑️ Clear
        </button>
      </div>

      {error && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 font-medium text-sm sm:text-base">
            Error: {error}
          </p>
        </div>
      )}

      {debugInfo && !error && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-600 text-sm sm:text-base">{debugInfo}</p>
        </div>
      )}

      {/* Instructions */}
      <div className="text-sm sm:text-base text-gray-500 space-y-2 sm:space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 text-center">
          <p className="flex items-center justify-center gap-2">
            <span className="text-lg">🎙️</span>
            <span className="text-xs sm:text-sm">Click to start streaming</span>
          </p>
          <p className="flex items-center justify-center gap-2">
            <span className="text-lg">📡</span>
            <span className="text-xs sm:text-sm">5-second silence timeout</span>
          </p>
          <p className="flex items-center justify-center gap-2 sm:col-span-2 lg:col-span-1">
            <span className="text-lg">⚡</span>
            <span className="text-xs sm:text-sm">Real-time transcription</span>
          </p>
        </div>
      </div>
    </div>
  );
}
