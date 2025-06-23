export interface StreamingTranscriptEvent {
  type: "connected" | "partial" | "final" | "completed" | "error";
  transcript?: string;
  confidence?: number;
  timestamp?: string;
  message?: string;
  error?: string;
  sessionId?: string;
}

export class ConnectionManager {
  private eventSource: EventSource | null = null;
  private onEvent: (event: StreamingTranscriptEvent) => void;
  private connectionCheckInterval: NodeJS.Timeout | null = null;

  constructor(onEvent: (event: StreamingTranscriptEvent) => void) {
    this.onEvent = onEvent;
  }

  async connect(): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        this.eventSource = new EventSource("/api/transcribe-stream-realtime");

        this.eventSource.onopen = () => {
          this.startConnectionMonitoring();
        };

        this.eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.onEvent(data);

            if (data.type === "connected" && data.sessionId) {
              resolve(data.sessionId);
            }
          } catch (error) {
            // Handle parsing error silently
          }
        };

        this.eventSource.onerror = (error) => {
          this.stopConnectionMonitoring();
          this.onEvent({
            type: "error",
            error: "Connection failed",
          });
          reject(new Error("Failed to establish connection"));
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private startConnectionMonitoring(): void {
    this.connectionCheckInterval = setInterval(() => {
      if (
        this.eventSource &&
        this.eventSource.readyState === EventSource.CLOSED
      ) {
        this.onEvent({ type: "error", error: "Connection lost" });
        this.stopConnectionMonitoring();
      }
    }, 5000);
  }

  private stopConnectionMonitoring(): void {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }
  }

  disconnect(): void {
    this.stopConnectionMonitoring();

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}
