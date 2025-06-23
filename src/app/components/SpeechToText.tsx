"use client";

import { useAudioRecording } from "../lib/hooks/useAudioRecording";
import { UI_MESSAGES } from "../lib/constants/audioConfig";

export default function SpeechToText() {
  const {
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
  } = useAudioRecording();

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
