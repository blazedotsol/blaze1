import React, { useEffect, useState, useRef } from "react";
import { Sparkles, Download, RefreshCw, Image as ImageIcon } from "lucide-react";

// === NYTT: kall Vercel-API'et direkte (same-origin) ===
async function generateImage(prompt: string, size = "1024x1024"): Promise<string> {
  const res = await fetch("/api/generate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, size }),
  });

  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json() : { raw: await res.text() };

  if (!res.ok) {
    const msg = (data as any)?.error || (data as any)?.raw || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  const b64 = (data as any)?.imageBase64 || (data as any)?.image;
  if (!b64) throw new Error("Tomt svar fra API");
  return b64;
}

function App() {
  const [wheelDelta, setWheelDelta] = useState(0);
  const [copied, setCopied] = useState(false);
  const [jumpScareTriggered, setJumpScareTriggered] = useState(false);
  const [showJumpScare, setShowJumpScare] = useState(false);
  const [showJumpScareText, setShowJumpScareText] = useState(false);
  const [screenBlink, setScreenBlink] = useState(false);
  const jumpScareRef = useRef<HTMLDivElement>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMeme, setGeneratedMeme] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");

  // (uendret) enkel lyd
  const playScreamSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const duration = 1.5;
      const sampleRate = audioContext.sampleRate;
      const frameCount = sampleRate * duration;
      const arrayBuffer = audioContext.createBuffer(1, frameCount, sampleRate);
      const channelData = arrayBuffer.getChannelData(0);
      for (let i = 0; i < frameCount; i++) {
        const t = i / sampleRate;
        const freq1 = 800 + Math.sin(t * 50) * 400;
        const freq2 = 1200 + Math.sin(t * 30) * 300;
        const freq3 = 400 + Math.sin(t * 80) * 200;
        let sample = Math.sin(2 * Math.PI * freq1 * t) * 0.3;
        sample += Math.sin(2 * Math.PI * freq2 * t) * 0.2;
        sample += Math.sin(2 * Math.PI * freq3 * t) * 0.1;
        sample += (Math.random() - 0.5) * 0.3;
        sample = Math.tanh(sample * 3);
        const envelope = Math.sin((Math.PI * t) / duration);
        channelData[i] = sample * envelope * 0.5;
      }
      const source = audioContext.createBufferSource();
      source.buffer = arrayBuffer;
      source.connect(audioContext.destination);
      source.start();
    } catch {
      // ignore
    }
  };

  const generateMeme = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError(null);
    setGeneratedMeme(null);
    try {
      const b64 = await generateImage(prompt);
      setGeneratedMeme(`data:image/png;base64,${b64}`);
    } catch (err: any) {
      console.error("Error generating image:", err);
      setError(err?.message || "Unknown error");
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    const maxZoomScroll = window.innerHeight * 2;

    const handleWheel = (e: WheelEvent) => {
      if (wheelDelta < maxZoomScroll) {
        e.preventDefault();
        setWheelDelta((prev) => Math.min(prev + Math.abs(e.deltaY), maxZoomScroll));
      }
    };

    const handleScroll = () => {
      // Jump-scare logikk er slått av (if false), beholdt som hos deg
      if (false && jumpScareRef.current && !jumpScareTriggered) {
        const rect = jumpScareRef.current.getBoundingClientRect();
        const isInView = rect.top <= window.innerHeight && rect.bottom >= 0;
        if (isInView) {
          setJumpScareTriggered(true);
          setTimeout(() => {
            setScreenBlink(true);
            setShowJumpScare(true);
            playScreamSound();
            setTimeout(() => setScreenBlink(false), 200);
            setTimeout(() => setShowJumpScareText(true), 2000);
            setTimeout(() => {
              setShowJumpScare(false);
              setShowJumpScareText(false);
            }, 5000);
          }, 2000);
        }
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [wheelDelta, jumpScareTriggered]);

  const maxZoomScroll = typeof window !== "undefined" ? window.innerHeight * 2 : 1;
  const zoomScale = Math.min(0.1 + (wheelDelta / maxZoomScroll) * 0.9, 1.0);
  const isZoomComplete = wheelDelta >= maxZoomScroll;

  const handleCopyCA = async () => {
    try {
      await navigator.clipboard.writeText("scSdK1NCmLCLQrqGWTBXE7m7cPKe42nSsd2RzUGpump");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  return (
    <div className="bg-black">
      <header className="relative h-screen w-full overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/image.png')" }}
        />
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ transform: `scale(${zoomScale})`, transition: "transform 0.1s ease-out" }}
        >
          <img src="/application.png" alt="Application" className="max-w-full max-h-full object-contain opacity-80" />
        </div>

        <div className="absolute inset-0 distortion-overlay" />
        <div className="absolute inset-0 vhs-static" />
        <div className="absolute inset-0 vhs-tracking" />
        <div className="absolute inset-0 chromatic-aberration" />
        <div className="absolute inset-0 vhs-flicker" />
        <div className="absolute inset-0 tape-damage" />

        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
          <div className="text-center">
            <div className="flex justify-center gap-4 px-4 mb-3">
              <a
                href="https://www.tiktok.com/search?q=job%20application&t=1755801808136"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-black/80 backdrop-blur-sm border border-red-600/50 text-white px-4 py-2 rounded-lg hover:bg-red-900/50 hover:border-red-500 transition-all duration-300 text-sm font-semibold"
              >
                TikTok
              </a>
              <a
                href="https://x.com/jobapplicmeme"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-black/80 backdrop-blur-sm border border-red-600/50 text-white px-4 py-2 rounded-lg hover:bg-red-900/50 hover:border-red-500 transition-all duration-300 text-sm font-semibold"
              >
                X
              </a>
              <a
                href="https://x.com/i/communities/1925625907995185617"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-black/80 backdrop-blur-sm border border-red-600/50 text-white px-4 py-2 rounded-lg hover:bg-red-900/50 hover:border-red-500 transition-all duration-300 text-sm font-semibold"
              >
                $JOB Community
              </a>
              <a
                href="https://dexscreener.com/solana/emlddri7ppyvmvuni2zfbsshdzz9hd4yeyyn9hr85g4l"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-black/80 backdrop-blur-sm border border-red-600/50 text-white px-4 py-2 rounded-lg hover:bg-red-900/50 hover:border-red-500 transition-all duration-300 text-sm font-semibold"
              >
                DEX
              </a>
            </div>

            <div
              onClick={handleCopyCA}
              className="text-white/70 text-xs font-mono tracking-wider cursor-pointer hover:text-white/90 transition-colors duration-200"
            >
              CA: scSdK1NCmLCLQrqGWTBXE7m7cPKe42nSsd2RzUGpump
            </div>
            <div
              onClick={handleCopyCA}
              className="text-white/50 text-xs cursor-pointer hover:text-white/80 transition-colors duration-200 mt-1"
            >
              {copied ? "✓ Copied!" : "(click to copy)"}
            </div>
          </div>
        </div>
      </header>

      {/* Meme Creation Section */}
      <section
        className={`min-h-screen bg-gray-900 flex items-center justify-center transition-opacity duration-500 ${
          isZoomComplete ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-white font-black text-4xl md:text-6xl lg:text-8xl tracking-wider text-center mb-16">
            CREATE YOUR MEME
          </h2>

          <div className="bg-gray-900/50 backdrop-blur-sm border border-red-600/30 rounded-xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="w-8 h-8 text-red-500" />
              <h3 className="text-white font-bold text-2xl">Job Application Meme Creator</h3>
            </div>

            <p className="text-gray-300 mb-8 text-lg">Upload an image and AI will make the figure hold a job application!</p>

            <div className="space-y-6">
              <div>
                <label className="block text-white font-semibold mb-3 text-lg">Describe your job application meme:</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="A person holding a job application form, looking desperate and tired..."
                  className="w-full bg-black/50 border border-red-600/50 text-white p-4 rounded-lg focus:border-red-500 focus:outline-none resize-none"
                  rows={4}
                />
              </div>

              <button
                onClick={generateMeme}
                disabled={!prompt.trim() || isGenerating}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-8 py-4 rounded-lg font-bold text-xl transition-all duration-300 flex items-center justify-center gap-3"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-6 h-6 animate-spin" />
                    Creating Job Application Meme...
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-6 h-6" />
                    Create Job Application Meme
                  </>
                )}
              </button>

              {error && (
                <div className="p-4 bg-red-900/20 border border-red-600/30 rounded-lg">
                  <p className="text-red-200 text-sm mb-2">
                    <strong>Error:</strong> {error}
                  </p>
                </div>
              )}
            </div>

            {generatedMeme && (
              <div className="mt-8 p-6 bg-black/30 rounded-lg border border-red-600/20">
                <h4 className="text-white font-bold text-xl mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-red-500" />
                  Your Job Application Meme
                </h4>
                <div className="bg-white rounded-lg p-4 mb-4">
                  <img src={generatedMeme} alt="Generated job application meme" className="w-full max-w-lg mx-auto rounded-lg" />
                </div>
                <div className="flex gap-4">
                  <a
                    href={generatedMeme}
                    download="job-application-meme.png"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-300 flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Download
                  </a>
                  <button
                    onClick={() => {
                      setPrompt("");
                      setGeneratedMeme(null);
                      setError(null);
                    }}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-300 flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Create Another
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section ref={jumpScareRef} className="min-h-screen bg-black py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-white font-black text-4xl md:text-6xl lg:text-8xl tracking-wider text-center mb-16">
            MEME GALLERY
          </h2>
          <div className="text-center mb-16">
            <p className="text-gray-400 text-xl mb-8">Your generated memes will appear here</p>
          </div>
          <div className="text-center mt-16">
            <a
              href="https://x.com/i/communities/1925625907995185617"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-red-600 hover:bg-red-700 text-white px-12 py-4 rounded-lg font-bold text-xl transition-colors duration-300 inline-block"
            >
              Find More Memes in Our Community
            </a>
          </div>
        </div>
      </section>

      {screenBlink && <div className="fixed inset-0 z-40 bg-white animate-pulse" />}

      {showJumpScare && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <img src="/boo.png" alt="BOO" className="w-full h-full object-cover animate-pulse" style={{ animation: "shake 0.1s infinite" }} />
          </div>
          {showJumpScareText && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="text-center">
                <h1 className="text-red-500 font-black text-6xl md:text-8xl lg:text-9xl tracking-wider animate-pulse">BOO!</h1>
                <p className="text-white font-bold text-2xl md:text-4xl lg:text-5xl mt-4 animate-bounce">DID I SCARE YOU?</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
