import React, { useState, useEffect } from 'react';
import { Link2, ArrowRight } from 'lucide-react';

interface HeroProps {
  onGetPrice: (url: string) => void;
  isLoading: boolean;
  apiError?: string;
  selectedCity: string;
  onCityChange: (city: string) => void;
  adminPhone: string;
}

const SUPPORTED_PLATFORMS = [
  { name: 'Amazon', domain: 'amazon', logo: '📦', glowClass: 'hover:shadow-amber-100 hover:border-amber-400 hover:text-amber-700 hover:scale-105 hover:-translate-y-1', floatClass: 'animate-float-1' },
  { name: 'Flipkart', domain: 'flipkart', logo: '🛒', glowClass: 'hover:shadow-blue-100 hover:border-blue-400 hover:text-blue-700 hover:scale-105 hover:-translate-y-1', floatClass: 'animate-float-2' },
  { name: 'Myntra', domain: 'myntra', logo: '👗', glowClass: 'hover:shadow-rose-100 hover:border-rose-400 hover:text-rose-700 hover:scale-105 hover:-translate-y-1', floatClass: 'animate-float-3' },
  { name: 'Meesho', domain: 'meesho', logo: '🛍️', glowClass: 'hover:shadow-pink-100 hover:border-pink-400 hover:text-pink-700 hover:scale-105 hover:-translate-y-1', floatClass: 'animate-float-4' },
  { name: 'Ajio', domain: 'ajio', logo: '👟', glowClass: 'hover:shadow-indigo-100 hover:border-indigo-400 hover:text-indigo-700 hover:scale-105 hover:-translate-y-1', floatClass: 'animate-float-5' },
  { name: 'Nykaa', domain: 'nykaa', logo: '💄', glowClass: 'hover:shadow-fuchsia-100 hover:border-fuchsia-400 hover:text-fuchsia-700 hover:scale-105 hover:-translate-y-1', floatClass: 'animate-float-6' }
];

export const Hero: React.FC<HeroProps> = ({ onGetPrice, isLoading, apiError, selectedCity, onCityChange, adminPhone }) => {
  const [url, setUrl] = useState('');
  const [detectedPlatform, setDetectedPlatform] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!url) {
      setDetectedPlatform(null);
      setError('');
      return;
    }

    try {
      const lowerUrl = url.toLowerCase();
      const platform = SUPPORTED_PLATFORMS.find(p => {
        if (p.domain === 'amazon') {
          return lowerUrl.includes('amazon') || lowerUrl.includes('amzn');
        }
        return lowerUrl.includes(p.domain);
      });
      if (platform) {
        setDetectedPlatform(platform.name);
      } else if (url.startsWith('http://') || url.startsWith('https://')) {
        setDetectedPlatform('Indian Shopping Site');
      } else {
        setDetectedPlatform(null);
      }
      setError('');
    } catch (e) {
      setDetectedPlatform(null);
    }
  }, [url]);

  useEffect(() => {
    if (apiError) {
      setError(apiError);
    }
  }, [apiError]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('Please paste a product URL to continue.');
      return;
    }
    
    // Check if it is a valid URL
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.includes('.')) {
      setError('Please enter a valid product website link.');
      return;
    }

    onGetPrice(url);
  };

  const renderAnimatedText = (text: string, startDelay: number) => {
    const words = text.split(' ');
    let globalIndex = 0;

    return words.map((word, wordIdx) => {
      const chars = word.split('');
      return (
        <span key={wordIdx} className="inline-block whitespace-nowrap">
          {chars.map((char) => {
            const charIndex = globalIndex++;
            return (
              <span
                key={charIndex}
                className="animate-char text-3d"
                style={{
                  animationDelay: `${startDelay + charIndex * 0.06}s`,
                }}
              >
                {char}
              </span>
            );
          })}
          {/* Space between words */}
          {wordIdx < words.length - 1 && <span className="inline-block">&nbsp;</span>}
        </span>
      );
    });
  };

  return (
    <div className="flex flex-col items-center justify-center text-center px-4 py-12 md:py-24 max-w-4xl mx-auto">
      {/* Premium Badge */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-6 shadow-xs">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
        Shopping across borders, simplified
      </div>

      {/* Main Headline */}
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.3] mb-8 select-none">
        <span className="block mb-2 text-slate-900">
          {renderAnimatedText("Buy from India.", 0)}
        </span>
        <span className="block text-indigo-650">
          {renderAnimatedText("Delivered to Nepal.", 0.8)}
        </span>
      </h1>

      {/* Tagline / Subtitle */}
      <p className="text-lg md:text-xl text-slate-650 max-w-2xl mb-10 leading-relaxed font-medium">
        Paste any product link from Amazon, Flipkart, Myntra, Meesho, or any Indian shopping website. We'll estimate the total cost including delivery to Nepal.
      </p>

      {/* URL Input Form */}
      <form onSubmit={handleSubmit} className="w-full max-w-3xl mb-12 animate-fade-in px-2 sm:px-0">
        <div className="relative flex flex-col md:flex-row gap-2 md:gap-3 p-2 rounded-2xl md:rounded-3xl bg-white shadow-xl shadow-slate-100/60 border border-slate-100/80 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all duration-300">
          
          {/* Row 1: URL input */}
          <div className="relative flex-1 flex items-center bg-slate-50/50 md:bg-transparent border border-slate-100/60 md:border-none rounded-xl md:rounded-none py-1.5 px-3 md:py-0 md:px-0 focus-within:bg-white md:focus-within:bg-transparent focus-within:border-indigo-200 md:focus-within:border-none transition-all duration-200">
            <Link2 className="absolute left-3.5 md:left-4 w-4 h-4 md:w-5 md:h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Paste Product URL..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full pl-8.5 md:pl-12 pr-3 py-1.5 md:py-3.5 rounded-xl text-xs md:text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
              disabled={isLoading}
            />
          </div>

          {/* Row 2: City Selector & Button side-by-side on mobile, inline on desktop */}
          <div className="flex flex-row gap-2 md:contents">
            {/* City Selection Dropdown */}
            <div className="flex-1 md:flex-initial flex items-center justify-between md:justify-start border border-slate-100/60 md:border-none md:border-l md:border-slate-150 px-3 py-1.5 md:py-0 bg-slate-50/50 md:bg-transparent rounded-xl md:rounded-none">
              <span className="text-[10px] md:text-xs font-bold text-slate-400 md:text-slate-450 mr-1.5 uppercase tracking-wider">City:</span>
              <select
                value={selectedCity}
                onChange={(e) => onCityChange(e.target.value)}
                disabled={isLoading}
                className="text-xs md:text-sm font-extrabold text-slate-700 md:text-slate-800 focus:outline-none cursor-pointer bg-white md:bg-transparent py-0.5 pr-2 md:py-1 md:pr-4"
              >
                <option value="Nepalgunj">Nepalgunj</option>
                <option value="Kathmandu">Kathmandu</option>
                <option value="Lalitpur">Lalitpur</option>
                <option value="Bhaktapur">Bhaktapur</option>
                <option value="Pokhara">Pokhara</option>
                <option value="Biratnagar">Biratnagar</option>
                <option value="Butwal">Butwal</option>
                <option value="Dharan">Dharan</option>
                <option value="Chitwan">Chitwan</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 md:flex-initial md:px-8 py-2 md:py-3.5 rounded-xl md:rounded-2xl text-white text-xs md:text-sm font-bold transition-all duration-100 flex items-center justify-center gap-1.5 md:gap-2 btn-3d-indigo"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 md:h-5 md:w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Calculating...</span>
                </>
              ) : (
                <>
                  <span>Get Price</span>
                  <ArrowRight className="w-3.5 h-3.5 md:w-5 md:h-5" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Dynamic Detection Tooltip */}
        {detectedPlatform && (
          <div className="mt-3 text-left pl-4 text-sm text-slate-500 flex items-center gap-1.5">
            <span className="font-semibold text-indigo-600">Detected:</span>
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium">
              {detectedPlatform}
            </span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-3 text-left pl-4 text-sm text-rose-600 font-medium">
            ⚠️ {error}
          </div>
        )}
      </form>

      {/* Customer Satisfaction & Live Support Badging */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-xs text-slate-500 font-semibold mb-10 select-none">
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-full shadow-xs">
          <span className="text-amber-500 text-sm">⭐⭐⭐⭐⭐</span>
          <span>4.9/5 Rating</span>
          <span className="text-slate-300">|</span>
          <span className="text-indigo-650">1,200+ Satisfied Customers</span>
        </div>
        <a 
          href={`https://wa.me/${adminPhone.replace(/\D/g, '')}?text=Hi%2C%20I%20need%20assistance%20with%20my%20estimate.`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-100 px-3 py-1.5 rounded-full shadow-xs text-emerald-700 hover:text-emerald-800 transition-colors duration-200 cursor-pointer"
        >
          <span className="relative flex h-2 w-2">
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Live Customer Support (WhatsApp)</span>
        </a>
      </div>

      {/* Brand Logos Footer */}
      <div className="w-full">
        <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase mb-5">
          Supported Indian Marketplaces
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap md:justify-center gap-3 sm:gap-4 max-w-lg md:max-w-none mx-auto px-4">
          {SUPPORTED_PLATFORMS.map((platform) => (
            <div
              key={platform.name}
              className={`flex items-center justify-center md:justify-start gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-100 bg-white/50 text-slate-500 hover:bg-white shadow-xs transition-all duration-300 hover:shadow-md cursor-default hover:[animation-play-state:paused] ${platform.floatClass} ${platform.glowClass}`}
            >
              <span className="text-base group-hover:scale-110 transition-transform duration-200">{platform.logo}</span>
              <span className="font-semibold text-sm">{platform.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Customer Testimonials Section */}
      <div className="w-full mt-16 pt-12 border-t border-slate-100/80">
        <p className="text-xs font-bold tracking-wider text-indigo-650 uppercase mb-3">
          Customer Testimonials
        </p>
        <h3 className="text-2xl font-extrabold text-slate-900 mb-8">
          Loved by 1,200+ Shoppers in Nepal
        </h3>
        
        {/* Infinite Scrolling Testimonials Marquee */}
        <div className="marquee-container py-4">
          <div className="animate-scroll-testimonials">
            {[...Array(2)].map((_, loopIdx) => (
              <React.Fragment key={loopIdx}>
                {/* Card 1: Kathmandu */}
                <div className="w-[280px] sm:w-80 bg-white border border-slate-100 rounded-2xl p-5 hover:border-indigo-100 hover:shadow-lg transition-all duration-300 flex flex-col justify-between shadow-xs select-none">
                  <div>
                    <div className="flex items-center gap-1 mb-2 text-amber-500 text-xs">
                      <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                    </div>
                    <p className="text-slate-650 text-xs italic leading-relaxed mb-4 font-medium font-sans">
                      "Ordered a OnePlus phone from Amazon India. The price estimate was spot-on, and it arrived in Kathmandu in 5 days. Zero customs hassle!"
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-[10px]">
                      AS
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Aayush Shrestha</h4>
                      <p className="text-[9px] text-slate-450 font-semibold">Kathmandu • Verified Buyer</p>
                    </div>
                  </div>
                </div>

                {/* Card 2: Nepalgunj */}
                <div className="w-[280px] sm:w-80 bg-white border border-slate-100 rounded-2xl p-5 hover:border-indigo-100 hover:shadow-lg transition-all duration-300 flex flex-col justify-between shadow-xs select-none">
                  <div>
                    <div className="flex items-center gap-1 mb-2 text-amber-500 text-xs">
                      <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                    </div>
                    <p className="text-slate-650 text-xs italic leading-relaxed mb-4 font-medium font-sans">
                      "BorderBuy delivered my gaming gear from Amazon to Nepalgunj safely and quickly. Very satisfied with their service!"
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-[10px]">
                      BC
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Bibek Chaudhary</h4>
                      <p className="text-[9px] text-slate-450 font-semibold">Nepalgunj • Verified Buyer</p>
                    </div>
                  </div>
                </div>

                {/* Card 3: Lalitpur */}
                <div className="w-[280px] sm:w-80 bg-white border border-slate-100 rounded-2xl p-5 hover:border-indigo-100 hover:shadow-lg transition-all duration-300 flex flex-col justify-between shadow-xs select-none">
                  <div>
                    <div className="flex items-center gap-1 mb-2 text-amber-500 text-xs">
                      <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                    </div>
                    <p className="text-slate-650 text-xs italic leading-relaxed mb-4 font-medium font-sans">
                      "Myntra clothes are so much cheaper but delivery to Nepal was always a pain. BorderBuy makes it simple and delivery was fast!"
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center text-white font-bold text-[10px]">
                      PA
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Pooja Adhikari</h4>
                      <p className="text-[9px] text-slate-450 font-semibold">Lalitpur • Verified Buyer</p>
                    </div>
                  </div>
                </div>

                {/* Card 4: Pokhara */}
                <div className="w-[280px] sm:w-80 bg-white border border-slate-100 rounded-2xl p-5 hover:border-indigo-100 hover:shadow-lg transition-all duration-300 flex flex-col justify-between shadow-xs select-none">
                  <div>
                    <div className="flex items-center gap-1 mb-2 text-amber-500 text-xs">
                      <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                    </div>
                    <p className="text-slate-650 text-xs italic leading-relaxed mb-4 font-medium font-sans">
                      "Used BorderBuy to order sound equipment from Flipkart. Extremely prompt response on WhatsApp support. Highly recommended!"
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold text-[10px]">
                      RT
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Rupesh Thapa</h4>
                      <p className="text-[9px] text-slate-450 font-semibold">Pokhara • Verified Buyer</p>
                    </div>
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
export default Hero;
