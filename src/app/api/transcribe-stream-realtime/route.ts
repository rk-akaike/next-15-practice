import { NextRequest, NextResponse } from "next/server";
import {
  TranscribeStreamingClient,
  StartStreamTranscriptionCommand,
  AudioStream,
  AudioEvent,
  TranscriptEvent,
} from "@aws-sdk/client-transcribe-streaming";

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface StreamSession {
  controller: ReadableStreamDefaultController;
  encoder: TextEncoder;
  audioQueue: Uint8Array[];
  isActive: boolean;
  transcribeClient?: TranscribeStreamingClient;
  isTranscribeStreamStarted: boolean;
  createdAt: number;
}

// ============================================================================
// GLOBAL STATE MANAGEMENT
// ============================================================================

// Active streaming sessions
const activeSessions = new Map<string, StreamSession>();

// Cleanup old sessions every 5 minutes
setInterval(() => {
  const now = Date.now();
  const fiveMinutesAgo = now - 5 * 60 * 1000;

  for (const [sessionId, session] of activeSessions.entries()) {
    if (session.createdAt < fiveMinutesAgo) {
      cleanupSession(sessionId);
    }
  }
}, 5 * 60 * 1000);

// ============================================================================
// CORS HANDLING
// ============================================================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

// ============================================================================
// SSE CONNECTION ENDPOINT (GET)
// ============================================================================

export async function GET(request: NextRequest) {
  const sessionId = generateSessionId();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const session: StreamSession = {
        controller,
        encoder,
        audioQueue: [],
        isActive: true,
        isTranscribeStreamStarted: false,
        createdAt: Date.now(),
      };

      activeSessions.set(sessionId, session);

      sendMessage(session, {
        type: "connected",
        sessionId,
        message: "Real-time transcription ready",
      });

      const heartbeatInterval = setInterval(() => {
        if (session.isActive) {
          sendMessage(session, {
            type: "heartbeat",
            timestamp: new Date().toISOString(),
          });
        } else {
          clearInterval(heartbeatInterval);
        }
      }, 30000);

      setTimeout(() => {
        cleanupSession(sessionId);
        clearInterval(heartbeatInterval);
      }, 10 * 60 * 1000);
    },

    cancel() {
      cleanupSession(sessionId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

// ============================================================================
// AUDIO UPLOAD ENDPOINT (POST)
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session");

    if (!sessionId) {
      return createErrorResponse("Session ID required", 400);
    }

    const session = activeSessions.get(sessionId);
    if (!session) {
      return createErrorResponse("Session not found or expired", 404);
    }

    if (!session.isActive) {
      return createErrorResponse("Session is no longer active", 410);
    }

    const audioData = await request.arrayBuffer();
    const audioBytes = new Uint8Array(audioData);

    if (audioBytes.length === 0) {
      return createSuccessResponse();
    }

    const contentType = request.headers.get("content-type");
    let pcmData: Uint8Array;

    if (contentType === "audio/pcm") {
      pcmData = audioBytes;
    } else {
      return createSuccessResponse();
    }

    if (pcmData.length > 0) {
      session.audioQueue.push(pcmData);

      if (!session.isTranscribeStreamStarted) {
        session.isTranscribeStreamStarted = true;
        initializeAWSTranscription(session, sessionId).catch((error) => {
          session.isTranscribeStreamStarted = false;

          sendMessage(session, {
            type: "error",
            error: `AWS Transcribe Error: ${error.message}`,
          });
        });
      }
    }

    return createSuccessResponse();
  } catch (error) {
    return createErrorResponse("Internal server error", 500);
  }
}

// ============================================================================
// AWS TRANSCRIBE INTEGRATION
// ============================================================================

async function initializeAWSTranscription(
  session: StreamSession,
  sessionId: string
): Promise<void> {
  try {
    if (!session.transcribeClient) {
      session.transcribeClient = createTranscribeClient();
    }

    const audioStream = createAudioStreamGenerator(sessionId);

    const command = new StartStreamTranscriptionCommand({
      LanguageCode: "en-US",
      MediaEncoding: "pcm",
      MediaSampleRateHertz: 16000,
      AudioStream: audioStream,
    });

    const response = await session.transcribeClient.send(command);

    if (response.TranscriptResultStream) {
      for await (const event of response.TranscriptResultStream) {
        if (event.TranscriptEvent && session.isActive) {
          await handleTranscriptEvent(event.TranscriptEvent, session);
        }
      }
    }

    if (session.isActive) {
      sendMessage(session, {
        type: "completed",
        message: "Transcription completed",
      });
    }
  } catch (error) {
    if (session.isActive) {
      sendMessage(session, {
        type: "error",
        error: formatAWSError(error),
      });
    }
  }
}

function createTranscribeClient(): TranscribeStreamingClient {
  const credentials: any = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  };

  if (process.env.AWS_SESSION_TOKEN) {
    credentials.sessionToken = process.env.AWS_SESSION_TOKEN;
  }

  return new TranscribeStreamingClient({
    region: process.env.AWS_REGION || "us-east-1",
    credentials,
  });
}

async function* createAudioStreamGenerator(
  sessionId: string
): AsyncIterable<AudioStream> {
  let chunkCount = 0;

  while (activeSessions.has(sessionId)) {
    const session = activeSessions.get(sessionId);

    if (!session || !session.isActive) {
      break;
    }

    const chunksToProcess = session.audioQueue.length;

    if (chunksToProcess > 0) {
      for (let i = 0; i < chunksToProcess; i++) {
        const audioChunk = session.audioQueue.shift();

        if (audioChunk && audioChunk.length > 0) {
          chunkCount++;
          yield {
            AudioEvent: {
              AudioChunk: audioChunk,
            },
          };
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

async function handleTranscriptEvent(
  transcriptEvent: TranscriptEvent,
  session: StreamSession
): Promise<void> {
  try {
    const results = transcriptEvent.Transcript?.Results || [];

    for (const result of results) {
      if (result.Alternatives && result.Alternatives.length > 0) {
        const alternative = result.Alternatives[0];
        const transcript = alternative.Transcript || "";
        const confidence = alternative.Items?.[0]?.Confidence || 0;
        const isFinal = !result.IsPartial;

        if (transcript.trim()) {
          sendMessage(session, {
            type: isFinal ? "final" : "partial",
            transcript: transcript,
            confidence: confidence,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }
  } catch (error) {
    // Handle error silently
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateSessionId(): string {
  return Date.now().toString();
}

function sendMessage(session: StreamSession, data: any): void {
  if (!session.isActive) return;

  try {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    session.controller.enqueue(session.encoder.encode(message));
  } catch (error) {
    session.isActive = false;
  }
}

function cleanupSession(sessionId: string): void {
  const session = activeSessions.get(sessionId);

  if (session) {
    session.isActive = false;

    try {
      session.controller.close();
    } catch (error) {
      // Controller already closed
    }

    activeSessions.delete(sessionId);
  }
}

function formatAWSError(error: any): string {
  if (error.message?.includes("security token")) {
    return "AWS Authentication Failed: Invalid or expired credentials. Please check your AWS configuration.";
  }

  if (error.message?.includes("credentials")) {
    return "AWS Credentials Error: Please verify your AWS access keys are configured correctly.";
  }

  return `AWS Error: ${error.message || "Unknown AWS error occurred"}`;
}

function createErrorResponse(message: string, status: number): NextResponse {
  return new NextResponse(message, {
    status,
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}

function createSuccessResponse(): NextResponse {
  return new NextResponse("OK", {
    status: 200,
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}
