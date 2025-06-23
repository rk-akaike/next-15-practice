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
    Hello! This is a test of Amazon Polly SSML.
    <break time="500ms"/>
    Speaking slowly now.
    <prosody rate="slow">This is slow speech.</prosody>
    <break time="300ms"/>
    Emphasized word: <emphasis level="moderate">Fantastic!</emphasis>
    <break time="300ms"/>
    Digits: <say-as interpret-as="digits">2025</say-as>.
    <break time="300ms"/>
    Date: <say-as interpret-as="date">2025-06-20</say-as>.
</speak>`;

export const AVAILABLE_ENGINES = [
  {
    id: "neural",
    name: "Neural (High Quality)",
    description: "Latest AI-powered engine with most natural sound",
  },
  {
    id: "standard",
    name: "Standard",
    description: "Traditional engine with full SSML support",
  },
];

export const AVAILABLE_VOICES = [
  // English (US)
  {
    id: "Joanna",
    name: "Joanna",
    language: "English (US)",
    gender: "Female",
    engines: ["neural", "standard"],
  },
  {
    id: "Matthew",
    name: "Matthew",
    language: "English (US)",
    gender: "Male",
    engines: ["neural", "standard"],
  },
  {
    id: "Ivy",
    name: "Ivy",
    language: "English (US)",
    gender: "Female",
    engines: ["neural", "standard"],
  },
  {
    id: "Justin",
    name: "Justin",
    language: "English (US)",
    gender: "Male",
    engines: ["neural", "standard"],
  },
  {
    id: "Kendra",
    name: "Kendra",
    language: "English (US)",
    gender: "Female",
    engines: ["neural", "standard"],
  },
  {
    id: "Kimberly",
    name: "Kimberly",
    language: "English (US)",
    gender: "Female",
    engines: ["neural", "standard"],
  },
  {
    id: "Salli",
    name: "Salli",
    language: "English (US)",
    gender: "Female",
    engines: ["neural", "standard"],
  },
  {
    id: "Joey",
    name: "Joey",
    language: "English (US)",
    gender: "Male",
    engines: ["neural", "standard"],
  },

  // Neural-only voices (US)
  {
    id: "Aria",
    name: "Aria",
    language: "English (US)",
    gender: "Female",
    engines: ["neural"],
  },
  {
    id: "Ayanda",
    name: "Ayanda",
    language: "English (US)",
    gender: "Female",
    engines: ["neural"],
  },
  {
    id: "Hannah",
    name: "Hannah",
    language: "English (US)",
    gender: "Female",
    engines: ["neural"],
  },
  {
    id: "Liam",
    name: "Liam",
    language: "English (US)",
    gender: "Male",
    engines: ["neural"],
  },
  {
    id: "Zayd",
    name: "Zayd",
    language: "English (US)",
    gender: "Male",
    engines: ["neural"],
  },
  {
    id: "Danielle",
    name: "Danielle",
    language: "English (US)",
    gender: "Female",
    engines: ["neural"],
  },
  {
    id: "Gregory",
    name: "Gregory",
    language: "English (US)",
    gender: "Male",
    engines: ["neural"],
  },

  // English (UK)
  {
    id: "Amy",
    name: "Amy",
    language: "English (UK)",
    gender: "Female",
    engines: ["neural", "standard"],
  },
  {
    id: "Emma",
    name: "Emma",
    language: "English (UK)",
    gender: "Female",
    engines: ["neural", "standard"],
  },
  {
    id: "Brian",
    name: "Brian",
    language: "English (UK)",
    gender: "Male",
    engines: ["neural", "standard"],
  },

  // English (Australian)
  {
    id: "Nicole",
    name: "Nicole",
    language: "English (Australian)",
    gender: "Female",
    engines: ["neural", "standard"],
  },
  {
    id: "Russell",
    name: "Russell",
    language: "English (Australian)",
    gender: "Male",
    engines: ["neural", "standard"],
  },

  // English (Indian)
  {
    id: "Aditi",
    name: "Aditi",
    language: "English (Indian)",
    gender: "Female",
    engines: ["standard"],
  },
  {
    id: "Kajal",
    name: "Kajal",
    language: "English (Indian)",
    gender: "Female",
    engines: ["neural"],
  },

  // Spanish
  {
    id: "Conchita",
    name: "Conchita",
    language: "Spanish (Spain)",
    gender: "Female",
    engines: ["neural", "standard"],
  },
  {
    id: "Enrique",
    name: "Enrique",
    language: "Spanish (Spain)",
    gender: "Male",
    engines: ["neural", "standard"],
  },
  {
    id: "Penelope",
    name: "Penelope",
    language: "Spanish (US)",
    gender: "Female",
    engines: ["neural", "standard"],
  },
  {
    id: "Miguel",
    name: "Miguel",
    language: "Spanish (US)",
    gender: "Male",
    engines: ["neural", "standard"],
  },
  {
    id: "Mia",
    name: "Mia",
    language: "Spanish (Mexico)",
    gender: "Female",
    engines: ["neural", "standard"],
  },

  // Neural-only Spanish
  {
    id: "Pedro",
    name: "Pedro",
    language: "Spanish",
    gender: "Male",
    engines: ["neural"],
  },
  {
    id: "Arlet",
    name: "Arlet",
    language: "Spanish (Mexico)",
    gender: "Female",
    engines: ["neural"],
  },

  // French
  {
    id: "Celine",
    name: "Celine",
    language: "French",
    gender: "Female",
    engines: ["neural", "standard"],
  },
  {
    id: "Mathieu",
    name: "Mathieu",
    language: "French",
    gender: "Male",
    engines: ["neural", "standard"],
  },

  // German
  {
    id: "Marlene",
    name: "Marlene",
    language: "German",
    gender: "Female",
    engines: ["neural", "standard"],
  },
  {
    id: "Hans",
    name: "Hans",
    language: "German",
    gender: "Male",
    engines: ["neural", "standard"],
  },

  // Italian
  {
    id: "Carla",
    name: "Carla",
    language: "Italian",
    gender: "Female",
    engines: ["neural", "standard"],
  },
  {
    id: "Giorgio",
    name: "Giorgio",
    language: "Italian",
    gender: "Male",
    engines: ["neural", "standard"],
  },

  // Portuguese
  {
    id: "Ines",
    name: "Ines",
    language: "Portuguese",
    gender: "Female",
    engines: ["neural", "standard"],
  },
  {
    id: "Cristiano",
    name: "Cristiano",
    language: "Portuguese",
    gender: "Male",
    engines: ["neural", "standard"],
  },

  // Japanese
  {
    id: "Mizuki",
    name: "Mizuki",
    language: "Japanese",
    gender: "Female",
    engines: ["neural", "standard"],
  },
  {
    id: "Takumi",
    name: "Takumi",
    language: "Japanese",
    gender: "Male",
    engines: ["neural", "standard"],
  },

  // Other neural-only
  {
    id: "Burcu",
    name: "Burcu",
    language: "Turkish",
    gender: "Female",
    engines: ["neural"],
  },
];
