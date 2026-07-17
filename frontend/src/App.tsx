import React, { useState } from 'react';
import { Hero } from './components/Hero';
import { PriceEstimation } from './components/PriceEstimation';
import { CustomerForm } from './components/CustomerForm';
import { SuccessConfirmation } from './components/SuccessConfirmation';
import { Coins, ShieldCheck, Zap, Phone, Menu, X } from 'lucide-react';
import { InfoModals } from './components/InfoModals';

// Pricing configuration
const EXCHANGE_RATE = 1.6; // 1 INR = 1.6 NPR
const ADMIN_WHATSAPP_NUMBER = import.meta.env.VITE_ADMIN_WHATSAPP_NUMBER || '+9779800000000'; // Admin WhatsApp number for order redirection

interface ProductDetails {
  productUrl: string;
  productName: string;
  productImage: string;
  indianPriceINR: number;
  exchangeRate: number;
  serviceChargeNPR: number;
  deliveryChargeNPR: number;
  estimatedPriceNPR: number;
}

export const App: React.FC = () => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [productDetails, setProductDetails] = useState<ProductDetails | null>(null);
  const [savedOrder, setSavedOrder] = useState<any>(null);
  const [whatsappText, setWhatsappText] = useState('');
  const [mainTiltStyle, setMainTiltStyle] = useState<React.CSSProperties>({});
  const [selectedCity, setSelectedCity] = useState<string>('Nepalgunj');
  const [activeModal, setActiveModal] = useState<'terms' | 'privacy' | 'customs' | 'support' | 'guide' | 'pricing' | 'help' | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    if (productDetails) {
      const priceNPR = productDetails.indianPriceINR * EXCHANGE_RATE;
      const isNepalgunj = city.toLowerCase() === 'nepalgunj';
      const servicePercent = isNepalgunj ? 0.05 : 0.08;
      const deliveryChargeNPR = isNepalgunj ? 150 : 400;

      const serviceChargeNPR = Math.round(priceNPR * servicePercent);
      const estimatedPriceNPR = Math.round(priceNPR + serviceChargeNPR + deliveryChargeNPR);

      setProductDetails({
        ...productDetails,
        serviceChargeNPR,
        deliveryChargeNPR,
        estimatedPriceNPR
      });
    }
  };

  const handleMainMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateY = ((x - centerX) / centerX) * 6; // tilt horizontally
    const rotateX = -((y - centerY) / centerY) * 6; // tilt vertically
    
    setMainTiltStyle({
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
      transition: 'transform 0.05s ease-out'
    });
  };

  const handleMainMouseLeave = () => {
    setMainTiltStyle({
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg)',
      transition: 'transform 0.4s ease-out'
    });
  };

  const handleGetPrice = async (url: string) => {
    setIsLoading(true);
    setApiError('');
    
    try {
      const response = await fetch('/api/fetch-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to fetch product from server.');
      }

      const data = await response.json();
      
      // Parse scraped price
      const indianPriceINR = parseFloat(data.price);
      if (isNaN(indianPriceINR)) {
        throw new Error('Invalid price format returned from scraper.');
      }
      
      const priceNPR = indianPriceINR * EXCHANGE_RATE;
      const isNepalgunj = selectedCity.toLowerCase() === 'nepalgunj';
      const servicePercent = isNepalgunj ? 0.05 : 0.08;
      const deliveryNPR = isNepalgunj ? 150 : 400;

      const serviceChargeNPR = Math.round(priceNPR * servicePercent);
      const deliveryChargeNPR = deliveryNPR;
      const estimatedPriceNPR = Math.round(priceNPR + serviceChargeNPR + deliveryChargeNPR);

      setProductDetails({
        productUrl: url,
        productName: data.title,
        productImage: data.image,
        indianPriceINR,
        exchangeRate: EXCHANGE_RATE,
        serviceChargeNPR,
        deliveryChargeNPR,
        estimatedPriceNPR
      });

      setStep(2);
    } catch (err: any) {
      console.error('Scraping error:', err);
      setApiError(err.message || 'An error occurred while fetching the product.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmOrder = (customerData: {
    customerName: string;
    whatsappNumber: string;
    address: string;
    city: string;
    notes: string;
  }) => {
    if (!productDetails) return;

    setIsLoading(true);
    const orderPayload = {
      ...productDetails,
      ...customerData
    };

    // Format the WhatsApp message (matching backend format exactly)
    const simulatedText = 
      `🔔 *New BorderBuy Order!*\n\n` +
      `👤 *Customer Name:* ${customerData.customerName}\n` +
      `📞 *WhatsApp:* ${customerData.whatsappNumber}\n` +
      `📍 *Delivery Address:* ${customerData.address}, ${customerData.city}\n\n` +
      `📦 *Product Details:*\n` +
      `• *Name:* ${productDetails.productName}\n` +
      `• *Price (INR):* ₹${productDetails.indianPriceINR}\n` +
      `• *Est. Total (NPR):* ₨${productDetails.estimatedPriceNPR}\n` +
      `• *URL:* ${productDetails.productUrl}\n\n` +
      `📝 *Notes:* ${customerData.notes || 'None'}`;

    const cleanPhone = ADMIN_WHATSAPP_NUMBER.replace(/\D/g, '');
    const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(simulatedText)}`;

    setSavedOrder(orderPayload);
    setWhatsappText(simulatedText);
    setIsLoading(false);
    setStep(4);

    // Redirect user to WhatsApp directly
    window.open(waLink, '_blank');
  };

  const handleReset = () => {
    setProductDetails(null);
    setSavedOrder(null);
    setWhatsappText('');
    setStep(1);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between">
      {/* Navigation Header */}
      <header className="sticky top-0 bg-white/70 backdrop-blur-xl border-b border-white/30 shadow-md shadow-slate-100/50 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between">
          
          {/* Logo Brand Group */}
          <div className="flex items-center gap-2 cursor-pointer group" onClick={handleReset}>
            <img 
              src="/logo.jpg" 
              alt="BorderBuy Logo" 
              className="w-8 h-8 rounded-lg object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-350"
            />
            <div>
              <span className="font-extrabold text-base tracking-tight text-slate-900 leading-none">
                Border<span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">Buy</span>
              </span>
              <p className="text-[8.5px] text-indigo-600 font-extrabold tracking-wider uppercase -mt-0.5 group-hover:text-purple-600 transition-colors duration-300 leading-none">Nepal Delivery</p>
            </div>
          </div>

          {/* Center Links (Desktop only) */}
          <nav className="hidden md:flex items-center gap-5 text-xs font-bold text-slate-600">
            <span 
              onClick={() => setActiveModal('guide')}
              className="hover:text-indigo-650 cursor-pointer transition-colors duration-200 relative group py-1"
            >
              Platform Guide
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-indigo-600 group-hover:w-full transition-all duration-300"></span>
            </span>
            <span 
              onClick={() => setActiveModal('pricing')}
              className="hover:text-indigo-655 cursor-pointer transition-colors duration-200 relative group py-1"
            >
              Pricing Rate
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-indigo-600 group-hover:w-full transition-all duration-300"></span>
            </span>
            <span 
              onClick={() => setActiveModal('help')}
              className="hover:text-indigo-655 transition-colors duration-200 relative group py-1 cursor-pointer"
            >
              Help Center
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-indigo-650 group-hover:w-full transition-all duration-300"></span>
            </span>
          </nav>

          {/* Right Action Widgets */}
          <div className="flex items-center gap-2">
            {/* Live Exchange Rate Pill */}
            <div className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full border border-indigo-100/50 bg-indigo-50/50 text-indigo-700 backdrop-blur-xs">
              <Coins className="w-3 h-3 text-indigo-500 animate-pulse" />
              <span>₹1 INR = ₨1.60 NPR</span>
            </div>

            {/* Active Status Badge */}
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-800 font-bold bg-emerald-50/80 border border-emerald-100/85 px-2 py-1 rounded-full shadow-xs">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              India to Nepal
            </span>

            {/* Mobile Menu Toggle Button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-150 text-slate-650 transition-colors cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white/95 backdrop-blur-lg animate-in slide-in-from-top duration-200">
            <div className="px-5 py-3 flex flex-col gap-2.5 text-xs font-bold text-slate-700">
              <span 
                onClick={() => { setActiveModal('guide'); setMobileMenuOpen(false); }}
                className="hover:text-indigo-650 py-1.5 border-b border-slate-50 cursor-pointer transition-colors"
              >
                Platform Guide
              </span>
              <span 
                onClick={() => { setActiveModal('pricing'); setMobileMenuOpen(false); }}
                className="hover:text-indigo-650 py-1.5 border-b border-slate-50 cursor-pointer transition-colors"
              >
                Pricing Rate
              </span>
              <span 
                onClick={() => { setActiveModal('help'); setMobileMenuOpen(false); }}
                className="hover:text-indigo-655 py-1.5 border-b border-slate-50 cursor-pointer transition-colors"
              >
                Help Center
              </span>
              
              {/* Mobile-only exchange rate pill */}
              <div className="sm:hidden flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full border border-indigo-100/50 bg-indigo-50/50 text-indigo-700 w-fit">
                <Coins className="w-3 h-3 text-indigo-500 animate-pulse" />
                <span>₹1 INR = ₨1.60 NPR</span>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main wizard interface */}
      <main 
        onMouseMove={handleMainMouseMove}
        onMouseLeave={handleMainMouseLeave}
        className="flex-1 flex items-center justify-center py-6"
      >
        <div className="w-full" style={mainTiltStyle}>
          {step === 1 && (
            <Hero 
              onGetPrice={handleGetPrice} 
              isLoading={isLoading} 
              apiError={apiError} 
              selectedCity={selectedCity}
              onCityChange={handleCityChange}
              adminPhone={ADMIN_WHATSAPP_NUMBER}
            />
          )}

          {step === 2 && productDetails && (
            <PriceEstimation
              details={productDetails}
              onNext={() => setStep(3)}
              onBack={handleReset}
            />
          )}

          {step === 3 && productDetails && (
            <CustomerForm
              onSubmit={handleConfirmOrder}
              onBack={() => setStep(2)}
              isLoading={isLoading}
              estimatedTotal={productDetails.estimatedPriceNPR}
              selectedCity={selectedCity}
              onCityChange={handleCityChange}
            />
          )}

          {step === 4 && savedOrder && (
            <SuccessConfirmation
              orderData={savedOrder}
              whatsappPrefilledText={whatsappText}
              adminPhone={ADMIN_WHATSAPP_NUMBER}
              onReset={handleReset}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100/80 bg-gradient-to-b from-transparent via-white/50 to-indigo-50/20 backdrop-blur-md pt-12 pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          
          {/* Trust Guarantees Widgets (3 Columns) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-12">
            {/* Secure Payments Card */}
            <div className="flex gap-4 items-start p-5 rounded-2xl bg-white/40 border border-white/60 backdrop-blur-xs hover:bg-white/80 hover:border-indigo-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-650 flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-800 transition-colors duration-300 group-hover:text-indigo-650">100% Secure Ordering</h4>
                <p className="text-xs text-slate-500 leading-relaxed mt-1">Verified rates, manual calculation check, and secure checkout coordination.</p>
              </div>
            </div>

            {/* Hassle-Free Delivery Card */}
            <div className="flex gap-4 items-start p-5 rounded-2xl bg-white/40 border border-white/60 backdrop-blur-xs hover:bg-white/80 hover:border-indigo-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-650 flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-white transition-all duration-300 shadow-xs">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-800 transition-colors duration-300 group-hover:text-amber-600">Clear Customs Pricing</h4>
                <p className="text-xs text-slate-500 leading-relaxed mt-1">Customs duties and local delivery fees fully included. No hidden surcharges.</p>
              </div>
            </div>

            {/* Support Widget Card */}
            <div className="flex gap-4 items-start p-5 rounded-2xl bg-white/40 border border-white/60 backdrop-blur-xs hover:bg-white/80 hover:border-indigo-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-655 flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-xs">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-800 transition-colors duration-300 group-hover:text-emerald-650">Fast WhatsApp Support</h4>
                <p className="text-xs text-slate-500 leading-relaxed mt-1">Direct support and live updates from real humans throughout your shipping journey.</p>
              </div>
            </div>
          </div>

          {/* Main Footer Content Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 pt-10 border-t border-slate-150/40 mb-10 text-slate-500">
            
            {/* Column 1: Brand Info */}
            <div className="flex flex-col items-center sm:items-start gap-3">
              <div className="flex items-center gap-2 cursor-pointer group" onClick={handleReset}>
                <img 
                  src="/logo.jpg" 
                  alt="BorderBuy Logo" 
                  className="w-8 h-8 rounded-lg object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-350"
                />
                <span className="font-extrabold text-base tracking-tight text-slate-800">BorderBuy</span>
              </div>
              <p className="text-xs text-slate-400 text-center sm:text-left leading-relaxed">
                Shopping across borders to Nepal, made simple, transparent, and reliable.
              </p>
              
              {/* Social Media Handles */}
              <div className="flex items-center gap-3 mt-1.5 select-none">
                <a 
                  href="https://facebook.com/borderbuy.np" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-8.5 h-8.5 rounded-xl bg-white border border-slate-100/80 text-slate-400 hover:text-white flex items-center justify-center transition-all duration-300 hover:scale-115 hover:-translate-y-0.5 active:scale-95 hover:bg-gradient-to-r hover:from-blue-600 hover:to-indigo-600 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-200/50 cursor-pointer"
                  title="Follow us on Facebook"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z"/>
                  </svg>
                </a>
                <a 
                  href="https://instagram.com/borderbuy.np" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-8.5 h-8.5 rounded-xl bg-white border border-slate-100/80 text-slate-400 hover:text-white flex items-center justify-center transition-all duration-300 hover:scale-115 hover:-translate-y-0.5 active:scale-95 hover:bg-gradient-to-tr hover:from-amber-500 hover:via-red-500 hover:to-purple-600 hover:border-pink-500 hover:shadow-lg hover:shadow-pink-200/50 cursor-pointer"
                  title="Follow us on Instagram"
                >
                  <svg className="w-3.5 h-3.5 stroke-current fill-none stroke-[2]" viewBox="0 0 24 24">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                  </svg>
                </a>
                <a 
                  href="https://tiktok.com/@borderbuy.np" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-8.5 h-8.5 rounded-xl bg-white border border-slate-100/80 text-slate-400 hover:text-white flex items-center justify-center transition-all duration-300 hover:scale-115 hover:-translate-y-0.5 active:scale-95 hover:bg-slate-900 hover:border-slate-800 hover:shadow-lg hover:shadow-slate-300/50 cursor-pointer"
                  title="Follow us on TikTok"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.86-.74-3.95-1.72-.1.08-.21.16-.3.26-.03.73-.01 1.48-.02 2.22-.08 3.29-1.35 6.64-4.13 8.36-2.42 1.54-5.6 1.83-8.23.82-2.88-1.07-5.08-3.79-5.46-6.88-.47-3.27.79-6.79 3.39-8.79 2.02-1.58 4.72-2.12 7.22-1.47v4.18c-1.28-.42-2.73-.24-3.83.54-1.24.84-1.89 2.4-1.63 3.88.24 1.48 1.45 2.76 2.93 2.94 1.73.25 3.52-.77 4.02-2.43.14-.52.09-1.07.11-1.61V0h-.42z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Column 2: Platform Links */}
            <div className="flex flex-col items-center sm:items-start gap-2.5">
              <h5 className="text-[11px] font-extrabold tracking-wider uppercase text-slate-750">Platform</h5>
              <div className="flex flex-col items-center sm:items-start gap-2 text-xs font-bold text-slate-500">
                <span onClick={() => setActiveModal('guide')} className="hover:text-indigo-650 cursor-pointer transition-colors duration-150">Platform Guide</span>
                <span onClick={() => setActiveModal('pricing')} className="hover:text-indigo-650 cursor-pointer transition-colors duration-150">Pricing Calculator</span>
                <span onClick={() => setActiveModal('help')} className="hover:text-indigo-650 cursor-pointer transition-colors duration-150">Help Center / FAQs</span>
              </div>
            </div>

            {/* Column 3: Legal & Trust Links */}
            <div className="flex flex-col items-center sm:items-start gap-2.5">
              <h5 className="text-[11px] font-extrabold tracking-wider uppercase text-slate-750">Guides & Legal</h5>
              <div className="flex flex-col items-center sm:items-start gap-2 text-xs font-bold text-slate-500">
                <span onClick={() => setActiveModal('customs')} className="hover:text-indigo-650 cursor-pointer transition-colors duration-150">Customs Guide</span>
                <span onClick={() => setActiveModal('terms')} className="hover:text-indigo-650 cursor-pointer transition-colors duration-150">Terms of Service</span>
                <span onClick={() => setActiveModal('privacy')} className="hover:text-indigo-650 cursor-pointer transition-colors duration-150">Privacy Policy</span>
              </div>
            </div>

            {/* Column 4: Support Call-to-action */}
            <div className="flex flex-col items-center sm:items-start gap-3">
              <h5 className="text-[11px] font-extrabold tracking-wider uppercase text-slate-750">Need Assistance?</h5>
              <p className="text-xs text-slate-400 text-center sm:text-left leading-normal font-medium">
                Our support agents are available to calculate prices or help with delivery details.
              </p>
              
              {/* WhatsApp Quick Link Button */}
              <a 
                href={`https://wa.me/${ADMIN_WHATSAPP_NUMBER.replace(/\D/g, '')}?text=Hi%2C%20I%20have%20a%20question%20about%20ordering%20via%20BorderBuy.`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-600 border border-emerald-100 hover:border-emerald-600 text-emerald-700 hover:text-white rounded-xl text-xs font-extrabold shadow-xs transition-all duration-300 hover:scale-[1.02] cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5" />
                Contact Live Support
              </a>
              
              {/* Online status indicator */}
              <div className="flex items-center gap-1.5 text-[9px] font-extrabold text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Live Support Status: Active</span>
              </div>
            </div>

          </div>

          {/* Bottom Copyright Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-150/40 pt-6 text-[10px] text-slate-400">
            <p>© {new Date().getFullYear()} BorderBuy. All rights reserved.</p>
            <p className="mt-1 sm:mt-0 flex items-center gap-1">
              <span>Designed with ❤️ for Nepal Shoppers</span>
            </p>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Support Widget */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end gap-2 group">
        {/* Tooltip speech bubble */}
        <div className="bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-xl opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 relative mr-2 flex items-center gap-1.5 border border-slate-800">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span>Online! Chat with us</span>
          {/* Tooltip arrow */}
          <div className="absolute right-4 top-full w-2 h-2 bg-slate-900 rotate-45 -translate-y-1"></div>
        </div>

        {/* WhatsApp Button */}
        <a
          href={`https://wa.me/${ADMIN_WHATSAPP_NUMBER.replace(/\D/g, '')}?text=Hi%2C%20I%20have%20a%20question%20about%20ordering%20via%20BorderBuy.`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-12 h-12 sm:w-14 sm:h-14 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-emerald-200/50 hover:scale-110 active:scale-95 transition-all duration-300 relative group/btn"
        >
          {/* Pulsing indicator border */}
          <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-35 animate-ping group-hover/btn:animate-none"></span>
          
          {/* Custom WhatsApp SVG Icon */}
          <svg className="w-5.5 h-5.5 sm:w-7 sm:h-7 fill-current relative z-10" viewBox="0 0 24 24">
            <path d="M12.012 2c-5.506 0-9.975 4.47-9.975 9.977 0 1.76.456 3.48 1.323 5.006L2 22l5.176-1.358c1.477.807 3.137 1.233 4.832 1.233 5.505 0 9.977-4.47 9.977-9.977s-4.47-9.978-9.973-9.978zm0 18.286c-1.492 0-2.955-.4-4.232-1.157l-.304-.18-3.146.825.84-3.067-.197-.314a8.17 8.17 0 0 1-1.254-4.417c0-4.51 3.67-8.18 8.185-8.18 4.51 0 8.18 3.67 8.18 8.18s-3.67 8.18-8.18 8.18zm4.516-6.16c-.247-.124-1.463-.72-1.69-.802-.226-.083-.39-.124-.555.124-.165.247-.64.803-.784.968-.144.165-.288.186-.535.062a7.65 7.65 0 0 1-1.983-1.22 8.44 8.44 0 0 1-1.373-1.71c-.144-.247-.015-.38.11-.504.112-.112.247-.289.37-.433.125-.145.166-.248.248-.413.082-.165.04-.31-.02-.433-.06-.124-.555-1.34-.76-1.835-.2-.486-.4-.42-.555-.427-.144-.007-.31-.007-.474-.007a.91.91 0 0 0-.66.31c-.227.247-.866.845-.866 2.062 0 1.216.886 2.392.99 2.536.124.165 1.744 2.663 4.225 3.733.59.255 1.05.408 1.41.52.593.189 1.133.162 1.56.098.476-.072 1.463-.598 1.67-.175.205.422.205.783.103.906-.103.124-.475.247-.722.124z" />
          </svg>
        </a>
      </div>

      {/* Interactive Info Sheets */}
      <InfoModals 
        activeModal={activeModal} 
        onClose={() => setActiveModal(null)} 
        adminPhone={ADMIN_WHATSAPP_NUMBER}
      />
    </div>
  );
};
export default App;
