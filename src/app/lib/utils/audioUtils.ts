export const isBrowserSupported = (): boolean => {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
};

export const getMicrophoneStream = async (): Promise<MediaStream> => {
  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      sampleRate: 16000,
    },
  });
};

export const handleStartRecordingError = (err: unknown): string => {
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

  return errorMessage;
};
