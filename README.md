# Next.js Speech Processing App 🎙️🔊

A modern, real-time speech processing application built with Next.js that provides both **Speech-to-Text** and **Text-to-Speech** capabilities using AWS services.

## ✨ Features

### 🎙️ Speech-to-Text (AWS Transcribe)

- **Real-time streaming transcription** using AWS Transcribe Streaming API
- **Voice activity detection** with automatic silence detection
- **Auto-stop after 5 seconds of silence**
- **Live partial and final transcript display**
- **Low-latency streaming** optimized for real-time interaction
- **Browser microphone integration** with echo cancellation and noise suppression

### 🔊 Text-to-Speech (AWS Polly)

- **High-quality neural speech synthesis** using AWS Polly
- **Kajal voice (Indian English)** for natural-sounding speech
- **SSML support** for advanced speech markup
- **Audio playback controls** (play, pause, stop)
- **Sample SSML templates** for quick testing

## 🏗️ Architecture

### Frontend Components

```
src/app/
├── components/
│   ├── SpeechToText.tsx     # Real-time transcription UI
│   └── TextToSpeech.tsx     # Speech synthesis UI
├── lib/
│   ├── hooks/
│   │   ├── useAudioRecording.ts    # Speech-to-text logic
│   │   └── useTextToSpeech.ts      # Text-to-speech logic
│   ├── audio/
│   │   └── AudioStreamManager.ts   # Audio processing & streaming
│   ├── transcription/
│   │   └── ConnectionManager.ts    # WebSocket connection management
│   ├── constants/
│   │   └── audioConfig.ts         # Audio configuration constants
│   └── utils/
│       └── audioUtils.ts          # Browser audio utilities
└── api/
    ├── polly/                     # Text-to-speech API endpoint
    └── transcribe-stream-realtime/ # Speech-to-text streaming endpoint
```

### Data Flow

#### Speech-to-Text Flow:

1. **Browser** → Microphone access via `getUserMedia()`
2. **AudioStreamManager** → Processes raw audio into PCM format
3. **ConnectionManager** → Establishes SSE connection with backend
4. **API Route** → Streams audio to AWS Transcribe Streaming
5. **Real-time Results** → Partial and final transcripts via WebSocket

#### Text-to-Speech Flow:

1. **User Input** → Text or SSML markup
2. **API Route** → Sends request to AWS Polly
3. **Audio Generation** → Neural engine synthesis
4. **Playback** → Browser audio controls

## 🛠️ Technology Stack

### Core Technologies

- **Next.js 15.3.3** - React framework with App Router
- **React 19** - UI library with hooks
- **TypeScript 5** - Type safety and developer experience
- **Tailwind CSS 4** - Utility-first styling

### AWS Services

- **AWS Transcribe Streaming** - Real-time speech recognition
- **AWS Polly** - Neural text-to-speech synthesis
- **AWS SDK v3** - Client libraries for AWS services

### Audio Processing

- **Web Audio API** - Browser audio processing
- **MediaStream API** - Microphone access
- **ScriptProcessorNode** - Audio buffer processing
- **PCM Audio Format** - Raw audio data streaming

## 📁 Project Structure

```
next-practice/
├── src/app/
│   ├── components/           # React components
│   │   ├── SpeechToText.tsx
│   │   └── TextToSpeech.tsx
│   ├── lib/                  # Business logic & utilities
│   │   ├── hooks/           # Custom React hooks
│   │   ├── audio/           # Audio processing classes
│   │   ├── transcription/   # Connection management
│   │   ├── constants/       # Configuration constants
│   │   └── utils/           # Utility functions
│   ├── api/                 # Next.js API routes
│   │   ├── polly/
│   │   └── transcribe-stream-realtime/
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Main page
│   └── favicon.ico
├── public/                   # Static assets (cleaned)
├── package.json             # Dependencies & scripts
├── tsconfig.json            # TypeScript configuration
├── next.config.ts           # Next.js configuration
├── postcss.config.mjs       # PostCSS configuration
├── eslint.config.mjs        # ESLint configuration
├── tailwindcss.config.js    # Tailwind configuration
├── yarn.lock                # Dependency lock file
└── README-AWS-SETUP.md      # AWS setup guide
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Yarn package manager
- AWS Account with IAM permissions for Transcribe and Polly

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd next-practice
   ```

2. **Install dependencies**

   ```bash
   yarn install
   ```

3. **Configure AWS credentials**

   Create `.env.local` file:

   ```bash
   AWS_ACCESS_KEY_ID=your_access_key_here
   AWS_SECRET_ACCESS_KEY=your_secret_key_here
   AWS_SESSION_TOKEN=your_session_token_here  # if using temporary credentials
   AWS_REGION=us-west-2
   ```

4. **Required AWS IAM Permissions**

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "transcribe:StartStreamTranscription",
           "polly:SynthesizeSpeech"
         ],
         "Resource": "*"
       }
     ]
   }
   ```

5. **Start the development server**

   ```bash
   yarn dev
   ```

6. **Open in browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📊 API Endpoints

### POST `/api/transcribe-stream-realtime`

**Real-time speech transcription streaming**

- **Method**: GET (SSE connection) + POST (audio upload)
- **Input**: PCM audio data (16kHz, 16-bit)
- **Output**: Server-sent events with transcription results
- **Features**: Session management, automatic cleanup, voice activity detection

**Response Events:**

```typescript
{
  type: "connected" | "partial" | "final" | "completed" | "error",
  transcript?: string,
  confidence?: number,
  sessionId?: string,
  error?: string
}
```

### POST `/api/polly`

**Text-to-speech synthesis**

- **Method**: POST
- **Input**: JSON with text, voice settings
- **Output**: MP3 audio stream
- **Voice**: Kajal (Indian English, Neural Engine)

**Request Body:**

```typescript
{
  text: string,
  voiceId?: string,    // Default: "Kajal"
  engine?: string,     // Default: "neural"
  isSSML?: boolean     // Default: false
}
```

## 🎯 Usage

### Speech-to-Text

1. Click the microphone button to start recording
2. Speak clearly - transcription appears in real-time
3. Partial results show as you speak (green, italic)
4. Final results appear when you pause (black text)
5. Automatically stops after 5 seconds of silence
6. Click "Clear" to reset transcription

### Text-to-Speech

1. Enter text in the textarea (or enable SSML mode)
2. Click "Load Sample SSML" for SSML examples
3. Click "Convert to Speech" to generate audio
4. Use playback controls (Play, Pause, Stop)
5. Audio uses Kajal voice with neural engine for high quality

## 🏗️ Key Classes & Hooks

### `useAudioRecording`

Custom hook managing the complete speech-to-text flow:

- Microphone access and permissions
- Audio stream management
- Connection to transcription service
- State management for UI

### `useTextToSpeech`

Custom hook for text-to-speech functionality:

- API communication with Polly
- Audio playback controls
- SSML support
- Error handling

### `AudioStreamManager`

Core audio processing class:

- Web Audio API integration
- PCM format conversion
- Buffered audio streaming
- Real-time audio level monitoring

### `SilenceDetector`

Voice activity detection:

- Audio level analysis
- Configurable silence threshold
- Automatic recording termination
- Real-time feedback

### `ConnectionManager`

WebSocket connection management:

- Server-sent events handling
- Session management
- Connection monitoring
- Error recovery

## 🎨 UI/UX Features

- **Responsive design** - Works on desktop, tablet, and mobile
- **Real-time feedback** - Live status indicators and animations
- **Accessibility** - Keyboard navigation and screen reader support
- **Visual indicators** - Recording pulse animation, connection status
- **Error handling** - User-friendly error messages and recovery
- **Modern design** - Clean, professional interface with Tailwind CSS

## 🔧 Configuration

### Audio Configuration (`audioConfig.ts`)

```typescript
{
  sampleRate: 16000,        // AWS Transcribe requirement
  bufferSize: 1024,         // Audio processing buffer
  sendIntervalMs: 100,      // Stream upload frequency
  silenceThreshold: 0.005,  // Voice activity detection sensitivity
  silenceTimeoutMs: 5000    // Auto-stop timeout
}
```

### Voice Configuration

- **Voice**: Kajal (Indian English)
- **Engine**: Neural (high quality)
- **Output Format**: MP3
- **Sample Rate**: 16kHz (optimal for speech)

## 🚨 Troubleshooting

### Common Issues

1. **Microphone not working**

   - Check browser permissions
   - Ensure HTTPS (required for microphone access)
   - Try different browsers (Chrome, Firefox, Safari supported)

2. **AWS credentials errors**

   - Verify credentials in `.env.local`
   - Check IAM permissions
   - Ensure correct AWS region

3. **Audio quality issues**

   - Check microphone input level
   - Ensure stable internet connection
   - Try adjusting silence threshold

4. **Connection timeouts**
   - Sessions auto-expire after 10 minutes
   - Refresh page to reset connection
   - Check network connectivity

## 📝 Development

### Available Scripts

```bash
yarn dev          # Start development server with Turbopack
yarn build        # Build production bundle
yarn start        # Start production server
yarn lint         # Run ESLint
```

### Code Style

- TypeScript strict mode enabled
- ESLint with Next.js configuration
- Tailwind CSS for styling
- Functional components with hooks

## 🔒 Security

- Environment variables for AWS credentials
- Client-side audio processing only
- Session-based connection management
- Automatic session cleanup
- HTTPS required for microphone access

## 📈 Performance

- **Real-time streaming** with minimal latency
- **Buffered audio processing** for smooth operation
- **Automatic session cleanup** to prevent memory leaks
- **Optimized bundle size** with Next.js tree shaking
- **Neural engine** for high-quality speech synthesis

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

[Add your license information here]

---

Built with ❤️ using Next.js, AWS Transcribe, and AWS Polly
