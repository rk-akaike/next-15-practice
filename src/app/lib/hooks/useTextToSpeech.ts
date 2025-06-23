import { useState, useRef, useCallback } from "react";

export function useTextToSpeech() {
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isSSML, setIsSSML] = useState(false);
  const [engine, setEngine] = useState("neural");
  const [voiceId, setVoiceId] = useState("Kajal");
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [engineInfo, setEngineInfo] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleTextToSpeech = useCallback(async () => {
    if (!text.trim()) {
      setError("Please enter some text");
      return;
    }

    setIsLoading(true);
    setError(null);
    setDebugInfo(null);
    setEngineInfo(null);

    try {
      const response = await fetch("/api/polly", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text, voiceId, engine, isSSML }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Handle different types of errors
        if (response.status === 400) {
          if (errorData.validationErrors) {
            throw new Error(
              `Validation Error: ${errorData.validationErrors.join(", ")}`
            );
          } else {
            throw new Error(
              `Bad Request: ${errorData.details || errorData.error}`
            );
          }
        } else if (response.status === 429) {
          throw new Error(
            "Too many requests. Please wait a moment and try again."
          );
        } else if (response.status === 503) {
          throw new Error(
            "Service temporarily unavailable. Please try again later."
          );
        } else {
          throw new Error(
            errorData.details ||
              errorData.error ||
              "Failed to convert text to speech"
          );
        }
      }

      // Check for engine switch information
      const engineSwitch = response.headers.get("X-Engine-Switch");
      const finalEngine = response.headers.get("X-Final-Engine");
      const finalVoice = response.headers.get("X-Final-Voice");

      if (engineSwitch && finalEngine) {
        setEngineInfo(`⚠️ ${engineSwitch}`);
      }

      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.addEventListener("play", () => {
        setIsPlaying(true);
      });
      audio.addEventListener("pause", () => {
        setIsPlaying(false);
      });
      audio.addEventListener("ended", () => {
        setIsPlaying(false);
      });
      audio.addEventListener("error", () => {
        setError("Error playing audio");
      });

      await audio.play();
      setDebugInfo(
        `Audio generated successfully (${(audioBlob.size / 1024).toFixed(
          2
        )} KB) - Voice: ${finalVoice || voiceId}, Engine: ${
          finalEngine || engine
        }`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      if (err instanceof Error) {
        setDebugInfo(err.stack || null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [text, voiceId, engine, isSSML]);

  const handlePlay = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play();
    }
  }, []);

  const handlePause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  const handleStop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, []);

  return {
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
  };
}
