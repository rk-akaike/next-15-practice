import { AudioStreamConfig } from "../audio/AudioStreamManager";

export const AUDIO_CONFIG: AudioStreamConfig = {
  sampleRate: 16000,
  bufferSize: 1024,
  sendIntervalMs: 100,
  silenceThreshold: 0.005,
  silenceTimeoutMs: 5000,
};

export const UI_MESSAGES = {
  ready: "Click to start AWS Transcribe streaming",
  recording: "Streaming to AWS Transcribe - speak now!",
  connecting: "Connecting to AWS Transcribe...",
  error: "Error occurred - click to try again",
  completed: "Transcription completed",
} as const;

export const SAMPLE_SSML = `<speak>
  Hello! This is a simple SSML text.
  <break time="1s"/>
  I can speak clearly.
</speak>`;
