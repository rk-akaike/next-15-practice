import TextToSpeech from "./components/TextToSpeech";
import SpeechToText from "./components/SpeechToText";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <main className="w-full max-w-7xl mx-auto space-y-8 sm:space-y-12">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
          <div className="w-full flex justify-center">
            <div className="w-full max-w-2xl">
              <TextToSpeech />
            </div>
          </div>
          <div className="w-full flex justify-center">
            <div className="w-full max-w-2xl">
              <SpeechToText />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
