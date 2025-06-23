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
  console.log("🚀 Starting Polly API request");
  console.log("📝 Environment check:", {
    hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
    hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
    hasSessionToken: !!process.env.AWS_SESSION_TOKEN,
    region: process.env.AWS_REGION || "us-west-2",
  });

  try {
    const { text, voiceId = "Joanna", isSSML = false } = await request.json();
    console.log("📝 Request parameters:", {
      voiceId,
      isSSML,
      textLength: text?.length,
    });

    if (!text) {
      console.error("❌ No text provided in request");
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Always use standard engine for SSML to avoid Neural engine limitations
    const engine = isSSML ? "standard" : "neural";
    console.log("🛠 Using engine:", engine);

    console.log("🔄 Creating SynthesizeSpeechCommand");
    const command = new SynthesizeSpeechCommand({
      Text: text,
      VoiceId: voiceId,
      OutputFormat: "mp3",
      Engine: engine,
      TextType: isSSML ? "ssml" : "text",
    });

    console.log("�� Sending request to AWS Polly");
    const response = await pollyClient.send(command);
    console.log("📥 Received response from AWS Polly");

    if (!response.AudioStream) {
      console.error("❌ No audio stream in response");
      throw new Error("No audio stream received from Polly");
    }

    console.log("🔄 Converting audio stream to buffer");
    const audioBuffer = await response.AudioStream.transformToByteArray();
    console.log(
      "✅ Audio conversion complete, buffer size:",
      audioBuffer.length
    );

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("❌ Error in Polly API:", error);
    // Log detailed error information
    if (error instanceof Error) {
      console.error("Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    }
    return NextResponse.json(
      {
        error: "Failed to synthesize speech",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
