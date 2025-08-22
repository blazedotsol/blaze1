import React, { useEffect, useState, useRef } from "react";
import { Sparkles, Download, RefreshCw, Image as ImageIcon } from "lucide-react";
import { fileToDataUrl } from "./utils";

// Generate image with job application using proper image composition
async function generateJobApplicationImage(userImage: File): Promise<string> {
  try {
    const form = new FormData();
    form.append("userImage", userImage, "user.png");
    
    // Fetch template image and add to form
    const tplBlob = await (await fetch("/image copy copy.png")).blob();
    form.append("templateImage", tplBlob, "template.png");

    const res = await fetch("/api/generate-image", {
      method: "POST",
      body: form,
    });

    const data = await res.json();

    if (!res.ok) {
      const msg = data?.error || `HTTP ${res.status}`;
      throw new Error(msg);
    }

    const dataUrl = data?.dataUrl;
    if (!dataUrl) throw new Error("Empty response from API");
    return dataUrl;
  } catch (error: any) {
    if (error.message?.includes('fetch')) {
      throw new Error("Image generation service is temporarily unavailable. Please try again later.");
    }
    throw error;
  }
}

function App() {
  const [wheelDelta, setWheelDelta] = useState(0);
  const [copied, setCopied] = useState(false);
  const [jumpScareTriggered, setJumpScareTriggered] = useState(false);
  const [showJumpScare, setShowJumpScare] = useState(false);
  const [showJumpScareText, setShowJumpScareText] = useState(false);
  const [screenBlink, setScreenBlink] = useState(false);
  const jumpScareRef = useRef<HTMLDivElement>(null);

  // Block 1 states
  const [isGenerating1, setIsGenerating1] = useState(false);
  const [uploadedImage1, setUploadedImage1] = useState<File | null>(null);
  const [generatedMeme1, setGeneratedMeme1] = useState<string | null>(null);
  const [error1, setError1] = useState<string | null>(null);

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

  const handleImageUpload1 = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedImage1(file);
      setError1(null);
    }
  };

  const generateJobApplication = async () => {
    if (!uploadedImage1) {
      setError1("Please upload an image first");
      return;
    }

    setIsGenerating1(true);
    setError1(null);
    setGeneratedMeme1(null);

    try {
      const dataUrl = await generateJobApplicationImage(uploadedImage1);
      setGeneratedMeme1(dataUrl);
    } catch (err: any) {
      console.error("Error generating image:", err);
      setError1(err?.message || "Failed to generate image");
    } finally {
      setIsGenerating1(false);
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
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-white font-black text-4xl md:text-6xl lg:text-8xl tracking-wider text-center mb-16">
            CREATE YOUR MEME
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Block 1: Get your Job Application */}
            <div className="bg-gray-900/50 backdrop-blur-sm border border-red-600/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="w-6 h-6 text-red-500" />
                <h3 className="text-white font-bold text-xl">Get your Job Application</h3>
              </div>
              
              <p className="text-gray-300 mb-6 text-sm">Upload an image and make the figure hold a job application!</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-white font-semibold mb-2">Upload Image:</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload1}
                    className="w-full bg-black/50 border border-red-600/50 text-white p-3 rounded-lg focus:border-red-500 focus:outline-none file:bg-red-600 file:text-white file:border-none file:px-4 file:py-2 file:rounded file:mr-4"
                  />
                  {uploadedImage1 && (
                    <p className="text-green-400 text-sm mt-2">✓ {uploadedImage1.name}</p>
                  )}
                  {error1 && (
                    <p className="text-red-400 text-sm mt-2">{error1}</p>
                  )}
                </div>
                
                <button
                  onClick={generateJobApplication}
                  disabled={isGenerating1 || !uploadedImage1}
                  className="w-full bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold transition-all duration-300 flex items-center justify-center gap-2"
                >
                  {isGenerating1 ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-5 h-5" />
                      Generate
                    </>
                  )}
                </button>

                {generatedMeme1 && (
                  <div className="mt-4">
                    <img src={generatedMeme1} alt="Generated Job Application Meme" className="w-full rounded-lg" />
                    <a
                      href={generatedMeme1}
                      download="job-application-meme.png"
                      className="mt-2 w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Block 2: Download Template */}
            <div className="bg-gray-900/50 backdrop-blur-sm border border-red-600/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Download className="w-6 h-6 text-red-500" />
                <h3 className="text-white font-bold text-xl">Download Template</h3>
              </div>
              
              <p className="text-gray-300 mb-6 text-sm">Get the original job application template!</p>
              
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4 mb-4">
                  <img 
                    src="/image copy copy.png" 
                    alt="Job Application Template" 
                    className="w-full max-w-48 mx-auto rounded-lg"
                  />
                </div>
                
                <a
                  href="/image copy copy.png"
                  download="job-application-template.png"
                  className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Download Template
                </a>
              </div>
            </div>
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
