export interface AudioStreamConfig {
  sampleRate: number;
  bufferSize: number;
  sendIntervalMs: number;
  silenceThreshold: number;
  silenceTimeoutMs: number;
}

export class AudioStreamManager {
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
    if (this.isActive) return;

    this.silenceDetector = silenceDetector || null;
    this.isActive = true;

    try {
      this.audioContext = new AudioContext({
        sampleRate: this.config.sampleRate,
      });

      const source = this.audioContext.createMediaStreamSource(this.stream);
      this.scriptProcessor = this.audioContext.createScriptProcessor(
        this.config.bufferSize,
        1,
        1
      );

      this.scriptProcessor.addEventListener("audioprocess", (event) =>
        this.handleAudioProcess(event)
      );

      source.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);
    } catch (error) {
      this.isActive = false;
      throw error;
    }
  }

  private handleAudioProcess(event: AudioProcessingEvent): void {
    if (!this.isActive) return;

    const inputBuffer = event.inputBuffer;
    const inputData = inputBuffer.getChannelData(0);

    const int16Data = new Int16Array(inputData.length);
    for (let i = 0; i < inputData.length; i++) {
      const sample = Math.max(-1, Math.min(1, inputData[i]));
      int16Data[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }

    this.audioBuffer.push(int16Data);

    if (this.silenceDetector) {
      const avgAmplitude =
        inputData.reduce((sum, sample) => sum + Math.abs(sample), 0) /
        inputData.length;
      this.silenceDetector.updateAudioLevel(avgAmplitude);
    }

    const now = Date.now();
    if (now - this.lastSendTime >= this.config.sendIntervalMs) {
      this.sendBufferedAudio();
      this.lastSendTime = now;
    }
  }

  private async sendBufferedAudio(): Promise<void> {
    if (this.audioBuffer.length === 0) return;

    const totalLength = this.audioBuffer.reduce(
      (sum, buffer) => sum + buffer.length,
      0
    );
    const combinedBuffer = new Int16Array(totalLength);

    let offset = 0;
    for (const buffer of this.audioBuffer) {
      combinedBuffer.set(buffer, offset);
      offset += buffer.length;
    }

    this.audioBuffer = [];

    try {
      const response = await fetch(
        `/api/transcribe-stream-realtime?session=${this.sessionId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "audio/pcm",
          },
          body: combinedBuffer.buffer,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      // Handle error silently
    }
  }

  stop(): void {
    this.isActive = false;

    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
    }

    this.audioBuffer = [];
    this.silenceDetector = null;
  }
}

export class SilenceDetector {
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
    if (this.isActive) return;

    this.isActive = true;
    this.silenceCount = 0;

    this.checkInterval = setInterval(() => {
      if (!this.isActive) return;

      if (this.lastAudioLevel < this.config.silenceThreshold) {
        this.silenceCount++;
        const secondsOfSilence = (this.silenceCount * 100) / 1000;

        this.onDebugUpdate(
          `🔇 Silence detected (${secondsOfSilence.toFixed(1)}s)`
        );

        if (secondsOfSilence >= this.config.silenceTimeoutMs / 1000) {
          this.onSilenceDetected();
          this.stop();
        }
      } else {
        if (this.silenceCount > 0) {
          this.silenceCount = 0;
          this.onDebugUpdate("🎤 Voice activity resumed");
        }
      }
    }, 100);
  }

  updateAudioLevel(level: number): void {
    this.lastAudioLevel = level;
  }

  stop(): void {
    this.isActive = false;

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}
