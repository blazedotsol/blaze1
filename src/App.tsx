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
  const [touchStart, setTouchStart] = useState<number | null>(null);

  // Block 1 states
  const [isGenerating1, setIsGenerating1] = useState(false);
  const [uploadedImage1, setUploadedImage1] = useState<File | null>(null);
  const [generatedMeme1, setGeneratedMeme1] = useState<string | null>(null);
  const [error1, setError1] = useState<string | null>(null);
  const [isThrowingAnimation, setIsThrowingAnimation] = useState(false);

  // Scroll delay state
  const [scrollStartTime, setScrollStartTime] = useState<number | null>(null);
  const [hasStartedScrolling, setHasStartedScrolling] = useState(false);
  // Jumpscare states
  const [showJumpscare, setShowJumpscare] = useState(false);
  const [jumpscareTriggered, setJumpscareTriggered] = useState(false);
  const jumpscareRef = useRef<HTMLDivElement>(null);
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

  const handleDownloadTemplate = () => {
    // Start throwing animation
    setIsThrowingAnimation(true);
    
    // Reset animation after it completes
    setTimeout(() => {
      setIsThrowingAnimation(false);
    }, 1000);
    
    // Download the template
    const link = document.createElement('a');
    link.href = '/image copy copy.png';
    link.download = 'job-application-template.png';
    link.click();
  };

  // Jumpscare effect
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !jumpscareTriggered) {
            setJumpscareTriggered(true);
            setShowJumpscare(true);
            
            // Play scream sound
            const audio = new Audio('/job.mp3');
            audio.volume = 0.5;
            audio.preload = 'auto';
            
            // Debug: Check if audio file exists
            console.log('Attempting to play jumpscare scream from:', audio.src);
            
            // Load and play audio
            audio.addEventListener('loadstart', () => console.log('Audio loading started'));
            audio.addEventListener('canplay', () => console.log('Audio can play'));
            audio.addEventListener('error', (e) => console.error('Audio error:', e));
            
            audio.load();
            
            // Try to play immediately
            audio.play()
              .then(() => {
                console.log('✅ Scream sound played successfully!');
              })
              .catch((error) => {
                console.error('❌ Audio play failed:', error);
                console.log('Will try to play on next user interaction...');
                
                // Fallback: play on next click anywhere
                const playOnClick = () => {
                  audio.play()
                    .then(() => console.log('✅ Scream played on user interaction'))
                    .catch(err => console.error('❌ Still failed:', err));
                  document.removeEventListener('click', playOnClick);
                };
                document.addEventListener('click', playOnClick);
              });
            
            // Hide jumpscare after 2 seconds
            setTimeout(() => {
              setShowJumpscare(false);
            }, 3000);
          }
        });
      },
      { threshold: 0.5 }
    );

    if (jumpscareRef.current) {
      observer.observe(jumpscareRef.current);
    }

    return () => observer.disconnect();
  }, [jumpscareTriggered]);
  useEffect(() => {
    const maxZoomScroll = typeof window !== "undefined" ? window.innerHeight * 1.5 : 1000;
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

    if (isMobile) {
      // On mobile, automatically animate the zoom effect
      const animateZoom = () => {
        setWheelDelta((prev) => {
          if (prev >= maxZoomScroll) return prev;
          return Math.min(prev + 15, maxZoomScroll);
        });
      };
      
      const interval = setInterval(animateZoom, 50);
      
      return () => clearInterval(interval);
    } else {
      // Desktop: keep scroll-based zoom
      const handleWheel = (e: WheelEvent) => {
        const currentTime = Date.now();
        
        if (!hasStartedScrolling) {
          setHasStartedScrolling(true);
          setScrollStartTime(currentTime);
          return; // Don't apply zoom on first scroll
        }
        
        if (scrollStartTime && currentTime - scrollStartTime < 1000) {
          return; // Wait 1 second before allowing zoom
        }
        
        setWheelDelta((prev) => Math.min(prev + Math.abs(e.deltaY), maxZoomScroll));
      };

      window.addEventListener("wheel", handleWheel, { passive: true });
      
      return () => {
        window.removeEventListener("wheel", handleWheel);
      };
    }
  }, [wheelDelta, hasStartedScrolling, scrollStartTime]);

  // Separate effect for mobile detection and reset
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      if (!isMobile) {
        // Reset zoom when switching to desktop
        setWheelDelta(0);
        setHasStartedScrolling(false);
        setScrollStartTime(null);
      }
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const maxZoomScroll = typeof window !== "undefined" ? window.innerHeight * 1.5 : 1000;
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
      {/* Jumpscare Overlay */}
      {showJumpscare && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black transition-opacity duration-1000" 
             style={{ 
               opacity: showJumpscare ? 1 : 0,
               animation: 'jumpscare-bg-fade 3s ease-out forwards'
             }}>
          <div className="relative w-full h-full flex items-center justify-center" style={{ animation: 'shake 0.5s infinite' }}>
            <img 
              src="/boo.png" 
              alt="Jumpscare" 
              className="max-w-full max-h-full object-contain relative z-10 transition-opacity duration-1000"
              style={{ animation: 'jumpscare-man-fade 3s ease-out forwards' }}
            />
            <div className="absolute inset-0 bg-red-600 opacity-30 animate-pulse" 
                 style={{ animation: 'jumpscare-red-fade 3s ease-out forwards' }}></div>
            {/* White flash overlay - above everything */}
            <div className="absolute inset-0 bg-white opacity-95 animate-pulse z-20" style={{ animation: 'flash 0.1s infinite' }}></div>
          </div>
        </div>
      )}

      <header className="relative h-screen w-full overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat h-screen md:h-screen" 
          style={{ 
            backgroundImage: 'url("/image copy.png")',
            height: typeof window !== "undefined" && window.innerWidth < 768 ? '90vh' : '100vh'
          }}
        />
        
        {/* Navigation buttons at top */}
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-20">
          <div className="flex justify-center gap-2 px-4 font-mono">
            <a
              href="https://x.com/jobapplicmeme"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-black border border-white text-white px-2 py-2 hover:bg-white hover:text-black transition-all duration-200 text-xs md:text-sm uppercase tracking-wider text-center"
            >
              x
            </a>
            <a
              href="https://dexscreener.com/solana/emlddri7ppyvmvuni2zfbsshdzz9hd4yeyyn9hr85g4l"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-black border border-white text-white px-2 py-2 hover:bg-white hover:text-black transition-all duration-200 text-xs md:text-sm uppercase tracking-wider text-center"
            >
              community
            </a>
            <a
              href="https://dexscreener.com/solana/emlddri7ppyvmvuni2zfbsshdzz9hd4yeyyn9hr85g4l"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-black border border-white text-white px-2 py-2 hover:bg-white hover:text-black transition-all duration-200 text-xs md:text-sm uppercase tracking-wider text-center"
            >
              dex
            </a>
            <a
              href="https://pump.fun/coin/scSdK1NCmLCLQrqGWTBXE7m7cPKe42nSsd2RzUGpump"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-block bg-black border border-white text-white px-2 py-2 hover:bg-white hover:text-black transition-all duration-200 text-xs md:text-sm uppercase tracking-wider text-center"
            >
              pump.fun
            </a>
            <a
              href="https://www.tiktok.com/search?q=job%20application&t=1755801808136"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-black border border-white text-white px-2 py-2 hover:bg-white hover:text-black transition-all duration-200 text-xs md:text-sm uppercase tracking-wider text-center"
            >
              tiktok
            </a>
          </div>
        </div>

        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ backgroundImage: 'url("/image copy.png")' }}
          style={{ 
            transform: `scale(${zoomScale})`, 
            transition: "transform 0.1s ease-out",
            height: typeof window !== "undefined" && window.innerWidth < 768 ? '90vh' : '100vh'
          }}
        >
          <img src="/application.png" alt="Application" className="w-4/5 h-4/5 object-contain" />
        </div>

        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 md:bottom-8" 
             style={{ 
               bottom: typeof window !== "undefined" && window.innerWidth < 768 ? 'calc(2rem + 60px)' : '2rem'
             }}>
          <div className="text-center">
            <div
              onClick={handleCopyCA}
              className="text-white text-xs md:text-sm font-mono tracking-wider cursor-pointer hover:text-gray-300 transition-colors duration-200 mb-2 px-2 text-center"
            >
              <span className="hidden md:inline">CA: </span>scSdK1NCmLCLQrqGWTBXE7m7cPKe42nSsd2RzUGpump
            </div>
            <div
              onClick={handleCopyCA}
              className="text-gray-400 text-xs font-mono cursor-pointer hover:text-white transition-colors duration-200 text-center"
            >
              {copied ? "✓ Copied!" : <span><span className="md:hidden">(click to copy ca)</span><span className="hidden md:inline">(click to copy)</span></span>}
            </div>
          </div>
        </div>
      </header>

      {/* Meme Creation Section */}
      <section
        className={`min-h-screen bg-black flex items-center justify-center transition-opacity duration-500 pt-16 md:pt-0 ${
          isZoomComplete ? "opacity-100" : "opacity-100 md:opacity-0 md:pointer-events-none"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-white font-mono text-2xl md:text-4xl lg:text-5xl uppercase tracking-widest text-center mb-16 border-b border-white pb-4">
            SUBMIT YOUR APPLICATION
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Block 1: Get your Job Application */}
            <div className="border border-white p-6 bg-white">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-black font-mono text-lg">{">"}</span>
                <h3 className="text-black font-mono text-lg uppercase tracking-wider">get your job application</h3>
              </div>
              
              <p className="text-gray-700 mb-6 text-sm font-mono">upload an image and make the figure hold a job application!</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-black font-mono text-sm mb-2 uppercase tracking-wider">upload image:</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload1}
                    className="w-full bg-gray-100 border border-black text-black p-3 focus:border-gray-500 focus:outline-none file:bg-black file:text-white file:border-none file:px-4 file:py-2 file:mr-4 font-mono text-sm"
                  />
                  {uploadedImage1 && (
                    <p className="text-black text-sm mt-2 font-mono">✓ {uploadedImage1.name}</p>
                  )}
                  {error1 && (
                    <p className="text-red-600 text-sm mt-2 font-mono">error: {error1}</p>
                  )}
                </div>
                
                <button
                  onClick={generateJobApplication}
                  disabled={isGenerating1 || !uploadedImage1}
                  className="w-full border border-black text-black px-6 py-3 hover:bg-black hover:text-white font-mono text-sm uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating1 ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      generating...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-5 h-5" />
                      generate
                    </>
                  )}
                </button>

                {generatedMeme1 && (
                  <div className="mt-4">
                    <img src={generatedMeme1} alt="Generated Job Application Meme" className="w-full border border-black" />
                    <a
                      href={generatedMeme1}
                      download="job-application-meme.png"
                      className="mt-2 w-full border border-black text-black px-4 py-2 hover:bg-black hover:text-white font-mono text-sm uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      download
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Block 2: Download Template */}
            <div className="border border-black p-6 bg-white relative overflow-visible">
              
              {/* Throwing application animation */}
              {isThrowingAnimation && (
                <div className="absolute inset-0 pointer-events-none overflow-visible">
                  <img 
                    src="/application-side.png" 
                    alt="Throwing Application" 
                    className="absolute w-32 h-40 throwing-application z-50"
                    style={{
                      left: '50%',
                      top: '70%',
                      transform: 'translate(-50%, -50%)'
                    }}
                  />
                </div>
              )}
              
              <div className="flex items-center gap-3 mb-4">
                <span className="text-black font-mono text-lg">{">"}</span>
                <h3 className="text-black font-mono text-lg uppercase tracking-wider">download template</h3>
              </div>
              
              <p className="text-gray-700 mb-6 text-sm font-mono">get the original job application template!</p>
              
              <div className="space-y-4">
                <img 
                  src="/eminem-app.jpg" 
                  alt="Eminem Application" 
                  className="w-3/4 mx-auto mb-4"
                />
                
                <button
                  onClick={handleDownloadTemplate}
                  className="w-full border border-black text-black px-6 py-3 hover:bg-black hover:text-white font-mono text-sm uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 relative z-10"
                >
                  <Download className="w-5 h-5" />
                  download template
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Jumpscare Trigger */}
      <div ref={jumpscareRef} className="h-1 w-full bg-transparent"></div>
      <section className="min-h-screen bg-black py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-white font-mono text-2xl md:text-4xl lg:text-5xl uppercase tracking-widest text-center mb-16 border-b border-white pb-4">
            lore
          </h2>
          
          <div className="max-w-4xl mx-auto">
            <div className="bg-white p-8 rounded-lg">
              <h3 className="text-black font-mono text-xl uppercase tracking-wider mb-6">What Is the Job Application Meme?</h3>
              
              <div className="text-black font-mono text-sm leading-relaxed space-y-4">
                <p>
                  Out of all the scary things you might run into online, you probably wouldn't expect a job application form to be one of them. But for a lot of people, especially those too "chronically online" to think about employment, the idea of facing a job application has become a meme-worthy jumpscare.
                </p>
                
                <p>
                  The job application form meme, sometimes called the job application jumpscare, uses real or fake applications as a kind of horror prop in memes, TikToks, and reaction images. The joke is that the form itself is treated like a creepy monster that sneaks up on the unemployed.
                </p>
                
                <p>
                  The format first appeared in 2019 with a viral post of someone literally wearing a job application as a Halloween mask. Since then, it's evolved into a running gag — especially on TikTok in 2025 — where creators insert the form into videos as if it's a terrifying surprise.
                </p>
                
                <p>
                  In short: the meme works because it turns something normally boring and stressful into a universal internet joke about how scary "having a job" can feel.
                </p>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-16">
            <a
              href="https://x.com/i/communities/1925625907995185617"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-white text-white px-12 py-4 hover:bg-white hover:text-black font-mono text-lg uppercase tracking-wider transition-colors duration-200 inline-block"
            >
              join our community
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

export default App;