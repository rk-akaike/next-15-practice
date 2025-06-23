import { NextResponse } from "next/server";
import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";

const pollyClient = new PollyClient({
  region: process.env.AWS_REGION || "us-west-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  },
});

// SSML features not supported by neural engine
const NEURAL_UNSUPPORTED_SSML_FEATURES = [
  "<prosody",
  "<emphasis",
  "<say-as",
  "<amazon:effect",
  "<amazon:auto-breaths",
  "<amazon:domain",
  "<lang",
  "<phoneme",
  "<sub",
  "<w",
];

// Voices that only support neural engine
const NEURAL_ONLY_VOICES = [
  "Kajal",
  "Aria",
  "Ayanda",
  "Arlet",
  "Hannah",
  "Liam",
  "Pedro",
  "Zayd",
  "Danielle",
  "Gregory",
  "Burcu",
];

// Voices that only support standard engine
const STANDARD_ONLY_VOICES = ["Aditi"];

// Valid engines
const VALID_ENGINES = ["neural", "standard"];

// Valid output formats
const VALID_OUTPUT_FORMATS = ["mp3", "ogg_vorbis", "pcm"];

// Voice fallback mapping for neural-only voices when switching to standard engine
const VOICE_FALLBACK_MAP: Record<string, { voice: string; reason: string }> = {
  Kajal: {
    voice: "Aditi",
    reason:
      "Kajal (neural-only) -> Aditi (Indian English, standard compatible)",
  },
  Aria: {
    voice: "Joanna",
    reason: "Aria (neural-only) -> Joanna (US English, standard compatible)",
  },
  Ayanda: {
    voice: "Joanna",
    reason: "Ayanda (neural-only) -> Joanna (US English, standard compatible)",
  },
  Arlet: {
    voice: "Mia",
    reason: "Arlet (neural-only) -> Mia (Mexican Spanish, standard compatible)",
  },
  Hannah: {
    voice: "Joanna",
    reason: "Hannah (neural-only) -> Joanna (US English, standard compatible)",
  },
  Liam: {
    voice: "Matthew",
    reason: "Liam (neural-only) -> Matthew (US English, standard compatible)",
  },
  Pedro: {
    voice: "Miguel",
    reason: "Pedro (neural-only) -> Miguel (US Spanish, standard compatible)",
  },
  Zayd: {
    voice: "Joanna",
    reason: "Zayd (neural-only) -> Joanna (US English, standard compatible)",
  },
  Danielle: {
    voice: "Joanna",
    reason:
      "Danielle (neural-only) -> Joanna (US English, standard compatible)",
  },
  Gregory: {
    voice: "Matthew",
    reason:
      "Gregory (neural-only) -> Matthew (US English, standard compatible)",
  },
  Burcu: {
    voice: "Joanna",
    reason: "Burcu (neural-only) -> Joanna (US English, standard compatible)",
  },
};

function hasNeuralUnsupportedFeatures(text: string): boolean {
  return NEURAL_UNSUPPORTED_SSML_FEATURES.some((feature) =>
    text.toLowerCase().includes(feature.toLowerCase())
  );
}

function validateInputs(
  text: string,
  voiceId: string,
  engine: string,
  outputFormat: string = "mp3"
) {
  const errors: string[] = [];

  if (!text || text.trim().length === 0) {
    errors.push("Text is required and cannot be empty");
  }

  if (text && text.length > 200000) {
    errors.push("Text is too long. Maximum length is 200,000 characters");
  }

  if (!voiceId) {
    errors.push("Voice ID is required");
  }

  if (!engine || !VALID_ENGINES.includes(engine)) {
    errors.push(`Invalid engine. Must be one of: ${VALID_ENGINES.join(", ")}`);
  }

  if (!VALID_OUTPUT_FORMATS.includes(outputFormat)) {
    errors.push(
      `Invalid output format. Must be one of: ${VALID_OUTPUT_FORMATS.join(
        ", "
      )}`
    );
  }

  // Check voice/engine compatibility
  if (voiceId && engine) {
    if (engine === "neural" && STANDARD_ONLY_VOICES.includes(voiceId)) {
      errors.push(`Voice "${voiceId}" only supports the standard engine`);
    }
    if (engine === "standard" && NEURAL_ONLY_VOICES.includes(voiceId)) {
      errors.push(`Voice "${voiceId}" only supports the neural engine`);
    }
  }

  return errors;
}

function getErrorMessage(error: any): string {
  if (error.name === "InvalidParameterValueException") {
    if (error.message.includes("Voice")) {
      return "The selected voice is not available or invalid. Please try a different voice.";
    }
    if (error.message.includes("Engine")) {
      return "The selected engine is not supported for this voice. Please try a different engine.";
    }
    if (error.message.includes("SSML")) {
      return "Invalid SSML markup. Please check your SSML syntax.";
    }
    return "Invalid parameter provided. Please check your input and try again.";
  }

  if (error.name === "TextLengthExceededException") {
    return "Text is too long. Please reduce the text length and try again.";
  }

  if (error.name === "InvalidSsmlException") {
    return "Invalid SSML markup. Please check your SSML syntax and try again.";
  }

  if (error.name === "ServiceFailureException") {
    return "Amazon Polly service is temporarily unavailable. Please try again later.";
  }

  if (error.name === "ThrottlingException") {
    return "Too many requests. Please wait a moment and try again.";
  }

  if (
    error.code === "CredentialsError" ||
    error.code === "UnauthorizedOperation"
  ) {
    return "Authentication error. Please check your AWS credentials.";
  }

  if (error.code === "NetworkingError") {
    return "Network connection error. Please check your internet connection and try again.";
  }

  // Handle specific error messages
  if (error.message) {
    if (error.message.includes("ByteString")) {
      return "Text contains unsupported characters. Please use only standard ASCII characters.";
    }
    if (error.message.includes("rate limit")) {
      return "Rate limit exceeded. Please wait a moment and try again.";
    }
    if (error.message.includes("timeout")) {
      return "Request timed out. Please try again.";
    }
  }

  return error instanceof Error
    ? error.message
    : "An unexpected error occurred";
}

export async function POST(request: Request) {
  try {
    const {
      text,
      voiceId = "Joanna",
      engine = "neural",
      isSSML = false,
      outputFormat = "mp3",
    } = await request.json();

    const validationErrors = validateInputs(
      text,
      voiceId,
      engine,
      outputFormat
    );
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationErrors.join("; "),
          validationErrors,
        },
        { status: 400 }
      );
    }

    let finalEngine = engine;
    let finalVoiceId = voiceId;
    let switchReason = null;

    if (isSSML && engine === "neural" && hasNeuralUnsupportedFeatures(text)) {
      finalEngine = "standard";

      if (NEURAL_ONLY_VOICES.includes(voiceId)) {
        const fallback = VOICE_FALLBACK_MAP[voiceId];
        if (fallback) {
          finalVoiceId = fallback.voice;
          switchReason = `Switched to standard engine for SSML compatibility. Voice changed: ${fallback.reason}`;
        } else {
          finalVoiceId = "Joanna";
          switchReason = `Switched to standard engine for SSML compatibility. Voice changed: ${voiceId} (neural-only) -> Joanna (standard compatible)`;
        }
      } else {
        switchReason =
          "Switched to standard engine due to neural-incompatible SSML features";
      }
    }

    const command = new SynthesizeSpeechCommand({
      Text: text,
      VoiceId: finalVoiceId,
      OutputFormat: outputFormat,
      Engine: finalEngine,
      TextType: isSSML ? "ssml" : "text",
    });

    const response = await pollyClient.send(command);

    if (!response.AudioStream) {
      throw new Error("No audio stream received from Amazon Polly");
    }

    const audioBuffer = await response.AudioStream.transformToByteArray();

    const headers: Record<string, string> = {
      "Content-Type":
        outputFormat === "mp3"
          ? "audio/mpeg"
          : outputFormat === "ogg_vorbis"
          ? "audio/ogg"
          : "audio/wav",
      "Content-Length": audioBuffer.length.toString(),
      "Cache-Control": "public, max-age=3600", // Cache for 1 hour
    };

    if (switchReason) {
      headers["X-Engine-Switch"] = switchReason;
      headers["X-Final-Engine"] = finalEngine;
      headers["X-Final-Voice"] = finalVoiceId;
    }

    return new NextResponse(audioBuffer, { headers });
  } catch (error: any) {
    console.error("Polly API Error:", error);

    const errorMessage = getErrorMessage(error);
    const statusCode =
      error.statusCode ||
      (error.name === "InvalidParameterValueException"
        ? 400
        : error.name === "TextLengthExceededException"
        ? 400
        : error.name === "InvalidSsmlException"
        ? 400
        : error.name === "ThrottlingException"
        ? 429
        : error.name === "ServiceFailureException"
        ? 503
        : 500);

    return NextResponse.json(
      {
        error: "Speech synthesis failed",
        details: errorMessage,
        type: error.name || "UnknownError",
        timestamp: new Date().toISOString(),
      },
      { status: statusCode }
    );
  }
}
