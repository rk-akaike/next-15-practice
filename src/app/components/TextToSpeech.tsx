"use client";

import { useTextToSpeech } from "../lib/hooks/useTextToSpeech";
import { SAMPLE_SSML } from "../lib/constants/audioConfig";

export default function TextToSpeech() {
  const {
    text,
    setText,
    isLoading,
    error,
    isPlaying,
    audioUrl,
    isSSML,
    setIsSSML,
    debugInfo,
    handleTextToSpeech,
    handlePlay,
    handlePause,
    handleStop,
  } = useTextToSpeech();

  const loadSampleSSML = () => {
    setText(SAMPLE_SSML);
    setIsSSML(true);
  };

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 bg-white rounded-lg shadow-lg">
      <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 sm:mb-6 text-center text-gray-800">
        Text to Speech - Kajal (Indian English) 🇮🇳
      </h2>

      <div className="space-y-4 sm:space-y-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isSSML}
              onChange={(e) => setIsSSML(e.target.checked)}
              className="form-checkbox h-4 w-4 sm:h-5 sm:w-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm sm:text-base font-medium text-gray-700">
              Use SSML
            </span>
          </label>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            {isSSML && (
              <button
                onClick={loadSampleSSML}
                className="text-sm text-blue-600 hover:text-blue-800 underline underline-offset-2 transition-colors"
              >
                Load Sample SSML
              </button>
            )}

            <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-md text-sm text-green-700 font-medium">
              🚀 Neural Engine (High Quality)
            </div>
          </div>
        </div>

        <div>
          <textarea
            className="w-full p-3 sm:p-4 border border-gray-300 rounded-lg mb-4 font-mono text-sm sm:text-base resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              isSSML
                ? "Enter SSML markup..."
                : "Enter text to convert to speech..."
            }
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 font-medium text-sm sm:text-base">
            Error: {error}
          </p>
          {debugInfo && (
            <pre className="mt-2 text-xs text-red-600 whitespace-pre-wrap overflow-x-auto">
              {debugInfo}
            </pre>
          )}
        </div>
      )}

      {debugInfo && !error && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-600 text-sm sm:text-base">{debugInfo}</p>
        </div>
      )}

      <div className="space-y-4">
        <button
          onClick={handleTextToSpeech}
          disabled={isLoading}
          className={`w-full py-3 sm:py-4 px-4 sm:px-6 rounded-lg text-white font-medium text-base sm:text-lg transition-all duration-200 ${
            isLoading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600 active:bg-blue-700 hover:shadow-lg"
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Converting...
            </span>
          ) : (
            "🎵 Convert to Speech"
          )}
        </button>

        {audioUrl && (
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <button
              onClick={handlePlay}
              disabled={!audioUrl || isPlaying}
              className={`py-2 sm:py-3 px-3 sm:px-4 rounded-lg text-white font-medium text-sm sm:text-base transition-all duration-200 ${
                !audioUrl || isPlaying
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-500 hover:bg-green-600 active:bg-green-700 hover:shadow-md"
              }`}
            >
              ▶️ Play
            </button>
            <button
              onClick={handlePause}
              disabled={!audioUrl || !isPlaying}
              className={`py-2 sm:py-3 px-3 sm:px-4 rounded-lg text-white font-medium text-sm sm:text-base transition-all duration-200 ${
                !audioUrl || !isPlaying
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700 hover:shadow-md"
              }`}
            >
              ⏸️ Pause
            </button>
            <button
              onClick={handleStop}
              disabled={!audioUrl}
              className={`py-2 sm:py-3 px-3 sm:px-4 rounded-lg text-white font-medium text-sm sm:text-base transition-all duration-200 ${
                !audioUrl
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-red-500 hover:bg-red-600 active:bg-red-700 hover:shadow-md"
              }`}
            >
              ⏹️ Stop
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 sm:mt-8 p-3 sm:p-4 bg-blue-50 rounded-lg">
        <p className="text-blue-800 text-sm sm:text-base font-medium mb-2">
          💡 Instructions:
        </p>
        <ul className="text-blue-700 text-xs sm:text-sm space-y-1 list-disc list-inside">
          <li>Enter plain text or enable SSML for advanced markup</li>
          <li>Using Kajal voice (Female, Indian English) 🇮🇳</li>
          <li>Powered by Neural engine for high-quality speech synthesis</li>
          <li>Click convert to generate speech audio</li>
          <li>Use the playback controls to manage audio playback</li>
        </ul>
      </div>
    </div>
  );
}
