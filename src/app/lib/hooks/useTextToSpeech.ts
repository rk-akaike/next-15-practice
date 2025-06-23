import { useState, useRef, useCallback } from "react";

export function useTextToSpeech() {
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isSSML, setIsSSML] = useState(false);
  const engine = "neural"; // Hardcoded to neural - Kajal only supports Neural engine
  const voiceId = "Kajal"; // Hardcoded to Kajal voice
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleTextToSpeech = useCallback(async () => {
    if (!text.trim()) {
      setError("Please enter some text");
      return;
    }

    setIsLoading(true);
    setError(null);
    setDebugInfo(null);

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
        throw new Error(
          errorData.details || "Failed to convert text to speech"
        );
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
        )} KB) - Voice: ${voiceId}, Engine: ${engine}`
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
    debugInfo,
    handleTextToSpeech,
    handlePlay,
    handlePause,
    handleStop,
  };
}
