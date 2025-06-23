import { NextResponse } from "next/server";
import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";

// Initialize the Polly client
const pollyClient = new PollyClient({
  region: process.env.AWS_REGION || "us-west-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    sessionToken: process.env.AWS_SESSION_TOKEN, // Include session token for temporary credentials
  },
});

export async function POST(request: Request) {
  try {
    const {
      text,
      voiceId = "Joanna",
      engine = "neural",
      isSSML = false,
    } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const command = new SynthesizeSpeechCommand({
      Text: text,
      VoiceId: voiceId,
      OutputFormat: "mp3",
      Engine: engine,
      TextType: isSSML ? "ssml" : "text",
    });

    const response = await pollyClient.send(command);

    if (!response.AudioStream) {
      throw new Error("No audio stream received from Polly");
    }

    const audioBuffer = await response.AudioStream.transformToByteArray();

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to synthesize speech",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
