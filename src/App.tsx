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

  // Block 1 states
  const [isGenerating1, setIsGenerating1] = useState(false);
  const [uploadedImage1, setUploadedImage1] = useState<File | null>(null);
  const [generatedMeme1, setGeneratedMeme1] = useState<string | null>(null);
  const [error1, setError1] = useState<string | null>(null);

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

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      window.removeEventListener("wheel", handleWheel);
    };
  }, [wheelDelta]);

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
          style={{ backgroundImage: 'url("/image copy.png")' }}
        />
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ transform: `scale(${zoomScale})`, transition: "transform 0.1s ease-out" }}
        >
          <img src="/application.png" alt="Application" className="w-4/5 h-4/5 object-contain" />
        </div>

        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
          <div className="text-center">
            <div className="flex justify-center gap-2 px-4 mb-6 font-mono">
              <a
                href="https://x.com/jobapplicmeme"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-black border border-white text-white px-4 py-2 hover:bg-white hover:text-black transition-all duration-200 text-sm uppercase tracking-wider text-center"
              >
                x
              </a>
              <a
                href="https://x.com/i/communities/1925625907995185617"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-black border border-white text-white px-4 py-2 hover:bg-white hover:text-black transition-all duration-200 text-sm uppercase tracking-wider text-center"
              >
                community
              </a>
              <a
                href="https://pump.fun/coin/scSdK1NCmLCLQrqGWTBXE7m7cPKe42nSsd2RzUGpump"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-black border border-white text-white px-4 py-2 hover:bg-white hover:text-black transition-all duration-200 text-sm uppercase tracking-wider text-center"
              >
                pump.fun
              </a>
              <a
                href="https://dexscreener.com/solana/emlddri7ppyvmvuni2zfbsshdzz9hd4yeyyn9hr85g4l"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-black border border-white text-white px-4 py-2 hover:bg-white hover:text-black transition-all duration-200 text-sm uppercase tracking-wider text-center"
              >
                dex
              </a>
              <a
                href="https://www.tiktok.com/search?q=job%20application&t=1755801808136"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-black border border-white text-white px-4 py-2 hover:bg-white hover:text-black transition-all duration-200 text-sm uppercase tracking-wider text-center"
              >
                tiktok
              </a>
            </div>

            <div
              onClick={handleCopyCA}
              className="text-white text-sm font-mono tracking-wider cursor-pointer hover:text-gray-300 transition-colors duration-200 mb-2"
            >
              CA: scSdK1NCmLCLQrqGWTBXE7m7cPKe42nSsd2RzUGpump
            </div>
            <div
              onClick={handleCopyCA}
              className="text-gray-400 text-xs font-mono cursor-pointer hover:text-white transition-colors duration-200"
            >
              {copied ? "✓ Copied!" : "(click to copy)"}
            </div>
          </div>
        </div>
      </header>

      {/* Meme Creation Section */}
      <section
        className={`min-h-screen bg-black flex items-center justify-center transition-opacity duration-500 ${
          isZoomComplete ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 handdrawn-sketch">
          <h2 className="text-white handdrawn-title text-3xl md:text-5xl lg:text-6xl text-center mb-16 handdrawn-underline wiggle">
            SUBMIT YOUR APPLICATION
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Block 1: Get your Job Application */}
            <div className="handdrawn-border p-6 wiggle" style={{ animationDelay: '0.5s' }}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-black handdrawn-text text-xl">→</span>
                <h3 className="text-black handdrawn-text text-xl font-bold">Get Your Job Application!</h3>
              </div>
              
              <p className="text-gray-700 mb-6 text-base handdrawn-text">Upload an image and make the figure hold a job application!</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-black handdrawn-text text-base mb-2 font-medium">Upload Image:</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload1}
                    className="w-full handdrawn-input text-black p-3 handdrawn-text text-sm file:handdrawn-button file:text-black file:px-4 file:py-2 file:mr-4 file:handdrawn-text"
                  />
                  {uploadedImage1 && (
                    <p className="text-green-600 text-sm mt-2 handdrawn-text">✓ {uploadedImage1.name}</p>
                  )}
                  {error1 && (
                    <p className="text-red-600 text-sm mt-2 handdrawn-text">Oops! {error1}</p>
                  )}
                </div>
                
                <button
                  onClick={generateJobApplication}
                  disabled={isGenerating1 || !uploadedImage1}
                  className="w-full handdrawn-button text-black px-6 py-3 handdrawn-text text-base font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating1 ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Creating Magic...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-5 h-5" />
                      Create Application!
                    </>
                  )}
                </button>

                {generatedMeme1 && (
                  <div className="mt-4">
                    <img src={generatedMeme1} alt="Generated Job Application Meme" className="w-full handdrawn-border" />
                    <a
                      href={generatedMeme1}
                      download="job-application-meme.png"
                      className="mt-2 w-full handdrawn-button text-black px-4 py-2 handdrawn-text text-base font-medium flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download My Creation!
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Block 2: Download Template */}
            <div className="handdrawn-border p-6 wiggle" style={{ animationDelay: '1s' }}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-black handdrawn-text text-xl">→</span>
                <h3 className="text-black handdrawn-text text-xl font-bold">Download Template!</h3>
              </div>
              
              <p className="text-gray-700 mb-6 text-base handdrawn-text">Get the original job application template!</p>
              
              <div className="space-y-4">
                <div className="handdrawn-border p-4 mb-4" style={{ background: '#f9f9f9' }}>
                  <img 
                    src="/image copy copy.png" 
                    alt="Job Application Template" 
                    className="w-full max-w-48 mx-auto"
                  />
                </div>
                
                <a
                  href="/image copy copy.png"
                  download="job-application-template.png"
                  className="w-full handdrawn-button text-black px-6 py-3 handdrawn-text text-base font-medium flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Get Template!
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="min-h-screen bg-black py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-white handdrawn-title text-3xl md:text-5xl lg:text-6xl text-center mb-16 handdrawn-underline">
            Meme Gallery
          </h2>
          <div className="text-center mb-16">
            <p className="text-gray-400 text-lg mb-8 handdrawn-text">Your generated memes will appear here!</p>
          </div>
          <div className="text-center mt-16">
            <a
              href="https://x.com/i/communities/1925625907995185617"
              target="_blank"
              rel="noopener noreferrer"
              className="handdrawn-button !bg-black !text-white px-12 py-4 hover:!bg-white hover:!text-black handdrawn-text text-lg transition-colors duration-200 inline-block"
            >
              Find More Memes in Our Community!
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

export default App;
