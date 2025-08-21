import React from 'react';
import { useEffect, useState, useRef } from 'react';
import { Sparkles, Download, RefreshCw, Upload, Image as ImageIcon } from 'lucide-react';
import { generateImage } from './api';

function App() {
  const [wheelDelta, setWheelDelta] = useState(0);
  const [actualScrollY, setActualScrollY] = useState(0);
  const [copied, setCopied] = useState(false);
  const [jumpScareTriggered, setJumpScareTriggered] = useState(false);
  const [showJumpScare, setShowJumpScare] = useState(false);
  const [showJumpScareText, setShowJumpScareText] = useState(false);
  const [screenBlink, setScreenBlink] = useState(false);
  const jumpScareRef = useRef<HTMLDivElement>(null);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMeme, setGeneratedMeme] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');

  // Create scream sound using Web Audio API
  const playScreamSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create a more complex scream-like sound
      const duration = 1.5;
      const sampleRate = audioContext.sampleRate;
      const frameCount = sampleRate * duration;
      const arrayBuffer = audioContext.createBuffer(1, frameCount, sampleRate);
      const channelData = arrayBuffer.getChannelData(0);
      
      // Generate a harsh, scream-like sound
      for (let i = 0; i < frameCount; i++) {
        const t = i / sampleRate;
        // Combine multiple frequencies for a harsh sound
        const freq1 = 800 + Math.sin(t * 50) * 400; // Varying frequency
        const freq2 = 1200 + Math.sin(t * 30) * 300;
        const freq3 = 400 + Math.sin(t * 80) * 200;
        
        // Create distorted waveform
        let sample = Math.sin(2 * Math.PI * freq1 * t) * 0.3;
        sample += Math.sin(2 * Math.PI * freq2 * t) * 0.2;
        sample += Math.sin(2 * Math.PI * freq3 * t) * 0.1;
        
        // Add noise and distortion
        sample += (Math.random() - 0.5) * 0.3;
        sample = Math.tanh(sample * 3); // Distortion
        
        // Apply envelope (fade in/out)
        const envelope = Math.sin(Math.PI * t / duration);
        channelData[i] = sample * envelope * 0.5;
      }
      
      // Play the sound
      const source = audioContext.createBufferSource();
      source.buffer = arrayBuffer;
      source.connect(audioContext.destination);
      source.start();
    } catch (error) {
      console.log('Audio not supported or blocked');
    }
  };

  const generateMeme = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    setError(null);
    
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
        // Prevent actual scrolling during zoom phase
        e.preventDefault();
        setWheelDelta(prev => Math.min(prev + Math.abs(e.deltaY), maxZoomScroll));
      }
    };

    const handleScroll = () => {
      setActualScrollY(window.scrollY);
      
      // Check if jump scare section is in view
      if (false && jumpScareRef.current && !jumpScareTriggered) {
        const rect = jumpScareRef.current.getBoundingClientRect();
        const isInView = rect.top <= window.innerHeight && rect.bottom >= 0;
        
        if (isInView) {
          setJumpScareTriggered(true);
          
          // Trigger screen blink and show jump scare immediately
          setTimeout(() => {
            setScreenBlink(true);
            setShowJumpScare(true);
            
            // Play scream sound using Web Audio API
            playScreamSound();
            
            // Hide screen blink after 200ms
            setTimeout(() => {
              setScreenBlink(false);
            }, 200);
            
            // Show text after 3 seconds
            setTimeout(() => {
              setShowJumpScareText(true);
            }, 2000);
            
            // Hide everything after 5 seconds total
            setTimeout(() => {
              setShowJumpScare(false);
              setShowJumpScareText(false);
            }, 5000);
          }, 2000);
        }
      }
    };

    // Add wheel listener for zoom effect (non-passive so we can preventDefault)
    window.addEventListener('wheel', handleWheel, { passive: false });
    // Add scroll listener for after zoom is complete
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [wheelDelta, jumpScareTriggered]);

  // Calculate zoom scale based on scroll position
  const maxZoomScroll = window.innerHeight * 2;
  const zoomScale = Math.min(0.1 + (wheelDelta / maxZoomScroll) * 0.9, 1.0); // Scale from 0.1 to 1.0
  const isZoomComplete = wheelDelta >= maxZoomScroll;

  const handleCopyCA = async () => {
    try {
      await navigator.clipboard.writeText('scSdK1NCmLCLQrqGWTBXE7m7cPKe42nSsd2RzUGpump');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <div className="bg-black">
      <header className="relative h-screen w-full overflow-hidden">
        {/* Background image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/image.png')"
          }}
        ></div>
        
        {/* Application image with zoom effect */}
        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: `scale(${zoomScale})`,
            transition: 'transform 0.1s ease-out'
          }}
        >
          <img src="/application.png" alt="Application" className="max-w-full max-h-full object-contain opacity-80" />
        </div>
        
        {/* Glitch overlay layers */}
        
        {/* Distortion effects */}
        <div className="absolute inset-0 distortion-overlay"></div>
        
        {/* VHS Horror Effects */}
        <div className="absolute inset-0 vhs-static"></div>
        <div className="absolute inset-0 vhs-tracking"></div>
        <div className="absolute inset-0 chromatic-aberration"></div>
        <div className="absolute inset-0 vhs-flicker"></div>
        <div className="absolute inset-0 tape-damage"></div>
        
        {/* Social buttons at bottom */}
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
              {copied ? '✓ Copied!' : '(click to copy)'}
            </div>
          </div>
        </div>
        
      </header>
      
      {/* Meme Creation Section */}
      <section 
        className={`min-h-screen bg-gray-900 flex items-center justify-center transition-opacity duration-500 ${
          isZoomComplete ? 'opacity-100' : 'opacity-0 pointer-events-none'
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
            
            <p className="text-gray-300 mb-8 text-lg">
              Upload an image and AI will make the figure hold a job application!
            </p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-white font-semibold mb-3 text-lg">
                  Describe your job application meme:
                </label>
                
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
              
              {/* Error Display */}
              {error && (
                <div className="p-4 bg-red-900/20 border border-red-600/30 rounded-lg">
                  <p className="text-red-200 text-sm mb-2">
                    <strong>Error:</strong> {error}
                  </p>
                  {error.includes('Backend server is not available') && (
                    <p className="text-yellow-200 text-xs">
                      💡 <strong>Note:</strong> The AI meme generator requires a backend server with OpenAI API access. 
                      This feature works in development mode but is not available in the published version.
                    </p>
                  )}
                </div>
              )}
            </div>
            
            {/* Generated Meme Display */}
            {generatedMeme && (
              <div className="mt-8 p-6 bg-black/30 rounded-lg border border-red-600/20">
                <h4 className="text-white font-bold text-xl mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-red-500" />
                  Your Job Application Meme
                </h4>
                <div className="bg-white rounded-lg p-4 mb-4">
                  <img 
                    src={generatedMeme} 
                    alt="Generated job application meme" 
                    className="w-full max-w-lg mx-auto rounded-lg"
                  />
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
                      setPrompt('');
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
      
      {/* Meme Gallery Section */}
      <section 
        ref={jumpScareRef}
        className="min-h-screen bg-black py-16 px-4"
      >
        <div className="max-w-7xl mx-auto">
          <h2 className="text-white font-black text-4xl md:text-6xl lg:text-8xl tracking-wider text-center mb-16">
            MEME GALLERY
          </h2>
          
          {/* Placeholder for user uploaded memes */}
          <div className="text-center mb-16">
            <p className="text-gray-400 text-xl mb-8">
              Your generated memes will appear here
            </p>
          </div>
          
          {/* Community Button */}
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
      
      {/* Screen Blink Effect */}
      {screenBlink && (
        <div className="fixed inset-0 z-40 bg-white animate-pulse"></div>
      )}
      
      {/* Jump Scare Overlay */}
      {showJumpScare && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden">
          {/* Single BOO image in center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <img
              src="/boo.png"
              alt="BOO"
              className="w-full h-full object-cover animate-pulse"
              style={{
                animation: 'shake 0.1s infinite'
              }}
            />
          </div>
          
          {/* BOO Text - appears after 3 seconds */}
          {showJumpScareText && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="text-center">
                <h1 className="text-red-500 font-black text-6xl md:text-8xl lg:text-9xl tracking-wider animate-pulse">
                  BOO!
                </h1>
                <p className="text-white font-bold text-2xl md:text-4xl lg:text-5xl mt-4 animate-bounce">
                  DID I SCARE YOU?
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;