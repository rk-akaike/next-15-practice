"use client";

import { useTextToSpeech } from "../lib/hooks/useTextToSpeech";
import {
  SAMPLE_SSML,
  AVAILABLE_ENGINES,
  AVAILABLE_VOICES,
} from "../lib/constants/audioConfig";

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
    engine,
    setEngine,
    voiceId,
    setVoiceId,
    debugInfo,
    engineInfo,
    handleTextToSpeech,
    handlePlay,
    handlePause,
    handleStop,
  } = useTextToSpeech();

  const loadSampleSSML = () => {
    setText(SAMPLE_SSML);
    setIsSSML(true);
  };

  const availableVoices = AVAILABLE_VOICES.filter((voice) =>
    voice.engines.includes(engine)
  );

  const currentVoice = AVAILABLE_VOICES.find((voice) => voice.id === voiceId);
  const currentEngine = AVAILABLE_ENGINES.find((eng) => eng.id === engine);

  const isVoiceCompatible = currentVoice?.engines.includes(engine);

  const handleEngineChange = (newEngine: string) => {
    setEngine(newEngine);

    if (currentVoice && !currentVoice.engines.includes(newEngine)) {
      const compatibleVoices = AVAILABLE_VOICES.filter((voice) =>
        voice.engines.includes(newEngine)
      );
      if (compatibleVoices.length > 0) {
        const sameLanguageVoice = compatibleVoices.find(
          (voice) => voice.language === currentVoice.language
        );
        setVoiceId(
          sameLanguageVoice ? sameLanguageVoice.id : compatibleVoices[0].id
        );
      }
    }
  };

  const getCharacterCount = () => {
    return text.length;
  };

  const isTextTooLong = () => {
    return text.length > 200000;
  };

  const getTextLengthWarning = () => {
    const length = text.length;
    if (length > 150000) {
      return "Text is very long. Consider shortening for better performance.";
    }
    if (length > 100000) {
      return "Text is quite long. Processing may take a moment.";
    }
    return null;
  };

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 bg-white rounded-lg shadow-lg">
      <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 sm:mb-6 text-center text-gray-800">
        Text to Speech
      </h2>

      <div className="space-y-4 sm:space-y-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Speech Engine
            </label>
            <select
              value={engine}
              onChange={(e) => handleEngineChange(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              {AVAILABLE_ENGINES.map((eng) => (
                <option key={eng.id} value={eng.id}>
                  {eng.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {currentEngine?.description}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Voice
            </label>
            <select
              value={voiceId}
              onChange={(e) => setVoiceId(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              {availableVoices.map((voice) => (
                <option key={voice.id} value={voice.id}>
                  {voice.name} - {voice.language} ({voice.gender})
                </option>
              ))}
            </select>
            {currentVoice && (
              <p className="text-xs text-gray-500 mt-1">
                {currentVoice.language} • {currentVoice.gender} • Supports:{" "}
                {currentVoice.engines.join(", ")}
              </p>
            )}
          </div>
        </div>

        {/* Compatibility Warning */}
        {!isVoiceCompatible && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-orange-800 text-sm font-medium">
              ⚠️ The selected voice "{currentVoice?.name}" is not compatible
              with the "{engine}" engine.
              {engine === "neural"
                ? " Try switching to Standard engine."
                : " Try switching to Neural engine."}
            </p>
          </div>
        )}

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
          </div>
        </div>

        <div>
          <div className="relative">
            <textarea
              className={`w-full p-3 sm:p-4 border rounded-lg mb-2 font-mono text-sm sm:text-base resize-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                isTextTooLong()
                  ? "border-red-300 focus:border-red-500"
                  : "border-gray-300 focus:border-blue-500"
              }`}
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                isSSML
                  ? "Enter SSML markup..."
                  : "Enter text to convert to speech..."
              }
              disabled={isLoading}
            />

            <div className="flex justify-between items-center text-xs text-gray-500 mb-4">
              <span
                className={isTextTooLong() ? "text-red-600 font-medium" : ""}
              >
                {getCharacterCount().toLocaleString()} / 200,000 characters
              </span>

              {getTextLengthWarning() && (
                <span className="text-orange-600 font-medium">
                  {getTextLengthWarning()}
                </span>
              )}
            </div>

            {isTextTooLong() && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm font-medium">
                  ⚠️ Text exceeds maximum length of 200,000 characters. Please
                  reduce the text length.
                </p>
              </div>
            )}
          </div>
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

      {engineInfo && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 font-medium text-sm sm:text-base">
            {engineInfo}
          </p>
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
          disabled={
            isLoading || !isVoiceCompatible || isTextTooLong() || !text.trim()
          }
          className={`w-full py-3 sm:py-4 px-4 sm:px-6 rounded-lg text-white font-medium text-base sm:text-lg transition-all duration-200 ${
            isLoading || !isVoiceCompatible || isTextTooLong() || !text.trim()
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

        {!isLoading &&
          (!isVoiceCompatible || isTextTooLong() || !text.trim()) && (
            <div className="mt-2 text-sm text-gray-600">
              <p className="font-medium mb-1">Cannot convert because:</p>
              <ul className="list-disc list-inside text-xs space-y-1">
                {!text.trim() && <li>No text entered</li>}
                {isTextTooLong() && (
                  <li>Text is too long (over 200,000 characters)</li>
                )}
                {!isVoiceCompatible && (
                  <li>
                    Selected voice is not compatible with the selected engine
                  </li>
                )}
              </ul>
            </div>
          )}

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
          <li>Select your preferred speech engine and voice</li>
          <li>Enter plain text or enable SSML for advanced markup</li>
          <li>
            Neural engine provides higher quality but limited SSML support
          </li>
          <li>Standard engine supports all SSML features</li>
          <li>System automatically handles compatibility issues</li>
        </ul>
      </div>
    </div>
  );
}
