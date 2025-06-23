"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface StreamingTranscriptEvent {
  type: "connected" | "partial" | "final" | "completed" | "error";
  transcript?: string;
  confidence?: number;
  timestamp?: string;
  message?: string;
  error?: string;
  sessionId?: string;
}

interface AudioStreamConfig {
  sampleRate: number;
  bufferSize: number;
  sendIntervalMs: number;
  silenceThreshold: number;
  silenceTimeoutMs: number;
}

// ============================================================================
// CONSTANTS AND CONFIGURATION
// ============================================================================

const AUDIO_CONFIG: AudioStreamConfig = {
  sampleRate: 16000,
  bufferSize: 1024, // Increased from 256 to reduce CPU load
  sendIntervalMs: 100, // Reduced from 20ms to 100ms (10 requests/sec instead of 50)
  silenceThreshold: 0.005, // Lowered threshold to be more sensitive to voice
  silenceTimeoutMs: 5000, // 5 seconds
};

const UI_MESSAGES = {
  ready: "Click to start AWS Transcribe streaming",
  recording: "Streaming to AWS Transcribe - speak now!",
  connecting: "Connecting to AWS Transcribe...",
  error: "Error occurred - click to try again",
  completed: "Transcription completed",
} as const;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SpeechToText() {
  // State management
  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  // Refs for cleanup and management
  const audioManagerRef = useRef<AudioStreamManager | null>(null);
  const connectionManagerRef = useRef<ConnectionManager | null>(null);
  const silenceDetectorRef = useRef<SilenceDetector | null>(null);

  // ============================================================================
  // MAIN FUNCTIONS
  // ============================================================================

  const startRecording = async () => {
    try {
      // Reset state
      resetState();
      setIsConnecting(true);
      setDebugInfo("🔌 Connecting to AWS Transcribe...");

      // Check browser support
      if (!isBrowserSupported()) {
        throw new Error(
          "Your browser doesn't support microphone access. Please use Chrome, Firefox, or Safari."
        );
      }

      // Get microphone permission
      const stream = await getMicrophoneStream();

      // Initialize connection manager
      connectionManagerRef.current = new ConnectionManager(
        handleTranscriptEvent
      );
      const sessionId = await connectionManagerRef.current.connect();

      // Initialize audio manager
      audioManagerRef.current = new AudioStreamManager(
        stream,
        sessionId,
        AUDIO_CONFIG
      );

      // Initialize silence detector
      silenceDetectorRef.current = new SilenceDetector(
        AUDIO_CONFIG,
        handleSilenceDetected,
        setDebugInfo
      );

      // Start everything
      await audioManagerRef.current.start(silenceDetectorRef.current);
      silenceDetectorRef.current.start();

      // Update UI state
      setIsRecording(true);
      setIsConnecting(false);
      setIsConnected(true);
      setDebugInfo("🎙️ Recording started - speak now!");
    } catch (err) {
      handleStartRecordingError(err);
    }
  };

  const stopRecording = useCallback(() => {
    console.log("⏹️ Stopping recording...");

    try {
      // Stop all managers
      silenceDetectorRef.current?.stop();
      audioManagerRef.current?.stop();
      connectionManagerRef.current?.disconnect();

      // Reset refs
      silenceDetectorRef.current = null;
      audioManagerRef.current = null;
      connectionManagerRef.current = null;

      // Update UI state
      setIsRecording(false);
      setIsConnecting(false);
      setIsConnected(false);
      setDebugInfo("⏹️ Recording stopped");
    } catch (err) {
      console.error("Error stopping recording:", err);
      // Still update UI even if cleanup fails
      setIsRecording(false);
      setIsConnecting(false);
      setIsConnected(false);
    }
  }, []);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleTranscriptEvent = useCallback(
    (event: StreamingTranscriptEvent) => {
      console.log("📨 Transcript event:", event.type, event.transcript || "");

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
    console.log("🔇 Silence detected - auto-stopping");
    setDebugInfo("⏹️ Stopped due to 5 seconds of silence");
    setTimeout(stopRecording, 100);
  }, [stopRecording]);

  const handleStartRecordingError = (err: unknown) => {
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
    setIsRecording(false);
    setIsConnecting(false);
    setIsConnected(false);
  };

  const clearTranscription = () => {
    setCurrentTranscript("");
    setFinalTranscript("");
    setError(null);
    setDebugInfo(null);
  };

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const resetState = () => {
    setError(null);
    setDebugInfo(null);
    setCurrentTranscript("");
    setFinalTranscript("");
  };

  const isBrowserSupported = (): boolean => {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  };

  const getMicrophoneStream = async (): Promise<MediaStream> => {
    return navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: AUDIO_CONFIG.sampleRate,
      },
    });
  };

  // ============================================================================
  // CLEANUP
  // ============================================================================

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      silenceDetectorRef.current?.stop();
      audioManagerRef.current?.stop();
      connectionManagerRef.current?.disconnect();
    };
  }, []);

  // ============================================================================
  // RENDER
  // ============================================================================

  const getButtonState = () => {
    if (isConnecting)
      return { icon: "🔄", disabled: true, className: "bg-yellow-500" };
    if (isRecording)
      return {
        icon: "⏹",
        disabled: false,
        className: "bg-red-500 hover:bg-red-600 animate-pulse",
      };
    return {
      icon: "🎙️",
      disabled: false,
      className: "bg-green-500 hover:bg-green-600",
    };
  };

  const getStatusMessage = () => {
    if (isConnecting) return UI_MESSAGES.connecting;
    if (isRecording) return UI_MESSAGES.recording;
    if (error) return UI_MESSAGES.error;
    return UI_MESSAGES.ready;
  };

  const buttonState = getButtonState();

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
                  AWS Connected
                </span>
              </div>
            )}
            {!isRecording && !isConnected && (
              <span className="text-gray-500 text-sm sm:text-base">Ready</span>
            )}
          </div>
        </div>
        <div className="mt-2 text-xs sm:text-sm text-green-700 font-medium">
          🚀 AWS Transcribe real-time streaming - optimized for low latency!
        </div>
      </div>

      {/* Recording Controls */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col items-center space-y-4 sm:space-y-6">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={buttonState.disabled}
            className={`w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-full flex items-center justify-center text-white font-bold text-2xl sm:text-3xl lg:text-4xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 ${
              buttonState.className
            } ${buttonState.disabled ? "cursor-not-allowed opacity-75" : ""}`}
          >
            {buttonState.icon}
          </button>
          <p className="text-sm sm:text-base text-gray-600 text-center max-w-md">
            {getStatusMessage()}
          </p>
        </div>
      </div>

      {/* Live Transcription Display */}
      <div className="mb-6 sm:mb-8">
        <div className="min-h-[120px] sm:min-h-[140px] p-4 sm:p-6 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-3 text-base sm:text-lg">
            Live Transcription:
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
              Start speaking - AWS will transcribe in real-time...
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

      {/* Error Display */}
      {error && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 font-medium text-sm sm:text-base">
            Error: {error}
          </p>
        </div>
      )}

      {/* Debug Info */}
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
            <span className="text-xs sm:text-sm">Click to start</span>
          </p>
          <p className="flex items-center justify-center gap-2">
            <span className="text-lg">🔇</span>
            <span className="text-xs sm:text-sm">
              Auto-stop after 5s silence
            </span>
          </p>
          <p className="flex items-center justify-center gap-2 sm:col-span-2 lg:col-span-1">
            <span className="text-lg">⚡</span>
            <span className="text-xs sm:text-sm">
              Optimized for low latency
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// AUDIO STREAM MANAGER CLASS
// ============================================================================

class AudioStreamManager {
  private stream: MediaStream;
  private sessionId: string;
  private config: AudioStreamConfig;
  private audioContext: AudioContext | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private audioBuffer: Int16Array[] = [];
  private lastSendTime = 0;
  private isActive = false;
  private silenceDetector: SilenceDetector | null = null;

  constructor(
    stream: MediaStream,
    sessionId: string,
    config: AudioStreamConfig
  ) {
    this.stream = stream;
    this.sessionId = sessionId;
    this.config = config;
  }

  async start(silenceDetector?: SilenceDetector): Promise<void> {
    try {
      this.silenceDetector = silenceDetector || null;

      this.audioContext = new AudioContext({
        sampleRate: this.config.sampleRate,
      });
      const source = this.audioContext.createMediaStreamSource(this.stream);

      this.scriptProcessor = this.audioContext.createScriptProcessor(
        this.config.bufferSize,
        1,
        1
      );

      this.scriptProcessor.onaudioprocess = this.handleAudioProcess.bind(this);

      source.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);

      this.isActive = true;
      this.lastSendTime = Date.now();

      console.log("🎵 Audio stream manager started with silence detection");
    } catch (error) {
      console.error("❌ Failed to start audio stream:", error);
      throw error;
    }
  }

  private handleAudioProcess(event: AudioProcessingEvent): void {
    if (!this.isActive) return;

    const inputBuffer = event.inputBuffer;
    const inputData = inputBuffer.getChannelData(0);

    // Calculate audio level for silence detection
    let audioLevel = 0;
    for (let i = 0; i < inputData.length; i++) {
      audioLevel += Math.abs(inputData[i]);
    }
    audioLevel = audioLevel / inputData.length;

    // Update silence detector with current audio level
    if (this.silenceDetector) {
      this.silenceDetector.updateAudioLevel(audioLevel);
    }

    // Convert to PCM
    const pcmData = new Int16Array(inputData.length);
    for (let i = 0; i < inputData.length; i++) {
      const sample = Math.max(-1, Math.min(1, inputData[i]));
      pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }

    this.audioBuffer.push(pcmData);

    // Send data at configured interval (much less frequent now)
    const now = Date.now();
    if (now - this.lastSendTime >= this.config.sendIntervalMs) {
      this.sendBufferedAudio();
      this.lastSendTime = now;
    }
  }

  private async sendBufferedAudio(): Promise<void> {
    if (this.audioBuffer.length === 0) return;

    try {
      // Combine buffered chunks
      const totalLength = this.audioBuffer.reduce(
        (sum, chunk) => sum + chunk.length,
        0
      );
      const combinedPCM = new Int16Array(totalLength);

      let offset = 0;
      for (const chunk of this.audioBuffer) {
        combinedPCM.set(chunk, offset);
        offset += chunk.length;
      }

      // Send to server (non-blocking)
      const uint8Data = new Uint8Array(combinedPCM.buffer);

      fetch(`/api/transcribe-stream-realtime?session=${this.sessionId}`, {
        method: "POST",
        body: uint8Data,
        headers: { "Content-Type": "audio/pcm" },
      }).catch(() => {
        // Silent error handling - don't spam console
      });

      // Clear buffer
      this.audioBuffer = [];
    } catch (error) {
      // Silent error handling
    }
  }

  stop(): void {
    console.log("🛑 Stopping audio stream manager");

    this.isActive = false;

    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }

    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
    }

    this.audioBuffer = [];
  }
}

// ============================================================================
// CONNECTION MANAGER CLASS
// ============================================================================

class ConnectionManager {
  private eventSource: EventSource | null = null;
  private onEvent: (event: StreamingTranscriptEvent) => void;
  private connectionCheckInterval: NodeJS.Timeout | null = null;

  constructor(onEvent: (event: StreamingTranscriptEvent) => void) {
    this.onEvent = onEvent;
  }

  async connect(): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        console.log("📡 Connecting to transcription service...");

        this.eventSource = new EventSource("/api/transcribe-stream-realtime");

        this.eventSource.onopen = () => {
          console.log("✅ Connection established");
        };

        this.eventSource.onmessage = (event) => {
          try {
            const data: StreamingTranscriptEvent = JSON.parse(event.data);

            if (data.type === "connected" && data.sessionId) {
              resolve(data.sessionId);
            }

            this.onEvent(data);
          } catch (error) {
            console.warn("Failed to parse message:", error);
          }
        };

        this.eventSource.onerror = (error) => {
          console.error("❌ Connection error:", error);
          this.onEvent({ type: "error", error: "Connection failed" });
          reject(error);
        };

        // Monitor connection health
        this.startConnectionMonitoring();
      } catch (error) {
        console.error("❌ Failed to establish connection:", error);
        reject(error);
      }
    });
  }

  private startConnectionMonitoring(): void {
    this.connectionCheckInterval = setInterval(() => {
      if (this.eventSource?.readyState === EventSource.CLOSED) {
        console.log("📡 Connection closed detected");
        this.onEvent({ type: "completed" });
        this.stopConnectionMonitoring();
      }
    }, 2000); // Check every 2 seconds (less frequent)
  }

  private stopConnectionMonitoring(): void {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }
  }

  disconnect(): void {
    console.log("📡 Disconnecting...");

    this.stopConnectionMonitoring();

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}

// ============================================================================
// SILENCE DETECTOR CLASS
// ============================================================================

class SilenceDetector {
  private config: AudioStreamConfig;
  private onSilenceDetected: () => void;
  private onDebugUpdate: (message: string) => void;
  private isActive = false;
  private silenceCount = 0;
  private checkInterval: NodeJS.Timeout | null = null;
  private lastAudioLevel = 0;

  constructor(
    config: AudioStreamConfig,
    onSilenceDetected: () => void,
    onDebugUpdate: (message: string) => void
  ) {
    this.config = config;
    this.onSilenceDetected = onSilenceDetected;
    this.onDebugUpdate = onDebugUpdate;
  }

  start(): void {
    console.log("🔇 Starting silence detection");

    this.isActive = true;
    this.silenceCount = 0;

    const maxSilenceChecks = this.config.silenceTimeoutMs / 200; // Check every 200ms

    this.checkInterval = setInterval(() => {
      if (!this.isActive) return;

      const hasVoice = this.lastAudioLevel > this.config.silenceThreshold;

      console.log(
        `🔊 Audio level: ${this.lastAudioLevel.toFixed(4)}, threshold: ${
          this.config.silenceThreshold
        }, hasVoice: ${hasVoice}, silenceCount: ${this.silenceCount}`
      );

      if (hasVoice) {
        // Reset silence counter when voice is detected
        if (this.silenceCount > 0) {
          console.log("🎤 Voice detected - resetting silence timer");
        }
        this.silenceCount = 0;
        this.onDebugUpdate("🎤 Voice detected - transcribing...");
      } else {
        this.silenceCount++;
        const remainingSeconds = Math.max(
          0,
          5 - Math.floor(this.silenceCount * 0.2)
        );
        this.onDebugUpdate(`🔇 Silence... auto-stop in ${remainingSeconds}s`);

        if (this.silenceCount >= maxSilenceChecks) {
          console.log(
            "⏰ Silence timeout reached after 5 seconds of actual silence"
          );
          this.onSilenceDetected();
          return;
        }
      }

      this.lastAudioLevel = 0; // Reset for next check
    }, 200);
  }

  updateAudioLevel(level: number): void {
    this.lastAudioLevel = Math.max(this.lastAudioLevel, level);
  }

  stop(): void {
    console.log("🛑 Stopping silence detection");

    this.isActive = false;

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}
