import React, { useState, useEffect } from 'react';
import { 
  X, Search, Calculator, BookOpen, FileText, 
  ShieldCheck, CheckCircle, MessageSquare, HelpCircle, 
  Info, Globe, Coins, ChevronDown, ChevronUp, Send, 
  AlertCircle, ArrowRight, User, Clock, Sparkles, Check, 
  ShoppingBag, Phone, Zap
} from 'lucide-react';

interface InfoModalsProps {
  activeModal: 'terms' | 'privacy' | 'customs' | 'support' | 'guide' | 'pricing' | 'help' | null;
  onClose: () => void;
  adminPhone: string;
}

export const InfoModals: React.FC<InfoModalsProps> = ({ activeModal, onClose, adminPhone }) => {
  const [faqSearch, setFaqSearch] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  
  // Pricing rate states
  const [inrInput, setInrInput] = useState<string>('1000');
  const [calcCity, setCalcCity] = useState<'Nepalgunj' | 'Other'>('Nepalgunj');
  const [calcResult, setCalcResult] = useState({
    nprConverted: 1600,
    servicePercent: 0.05,
    serviceFee: 80,
    deliveryFee: 150,
    totalNpr: 1830
  });

  // Support form states
  const [supportName, setSupportName] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [supportTopic, setSupportTopic] = useState('Order Issue');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSuccess, setSupportSuccess] = useState(false);

  // Platform guide current tab
  const [guideStep, setGuideStep] = useState(1);

  // Handle outside click to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (activeModal) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [activeModal, onClose]);

  // Reset form states when modal opens or closes to prevent memory leaks and unmounted state updates
  useEffect(() => {
    if (!activeModal) {
      setSupportName('');
      setSupportPhone('');
      setSupportMessage('');
      setSupportSuccess(false);
    }
  }, [activeModal]);

  // Recalculate price estimation
  useEffect(() => {
    const inrValue = parseFloat(inrInput) || 0;
    const nprConverted = Math.round(inrValue * 1.6);
    const isNepalgunj = calcCity === 'Nepalgunj';
    
    let servicePercent = 0.08;
    if (isNepalgunj) {
      if (inrValue <= 5000) {
        servicePercent = 0.05;
      } else if (inrValue <= 10000) {
        servicePercent = 0.03;
      } else {
        servicePercent = 0.02;
      }
    } else {
      if (inrValue <= 5000) {
        servicePercent = 0.08;
      } else if (inrValue <= 10000) {
        servicePercent = 0.05;
      } else {
        servicePercent = 0.03;
      }
    }
    
    const deliveryFee = isNepalgunj ? 150 : 400;
    const serviceFee = Math.round(nprConverted * servicePercent);
    const totalNpr = nprConverted + serviceFee + deliveryFee;

    setCalcResult({
      nprConverted,
      servicePercent,
      serviceFee,
      deliveryFee,
      totalNpr
    });
  }, [inrInput, calcCity]);

  if (!activeModal) return null;

  // Formatted title and icon
  const getHeaderInfo = () => {
    switch (activeModal) {
      case 'terms':
        return { title: 'Terms of Service', icon: <FileText className="w-6 h-6 text-indigo-600" /> };
      case 'privacy':
        return { title: 'Privacy Policy', icon: <ShieldCheck className="w-6 h-6 text-indigo-600" /> };
      case 'customs':
        return { title: 'Customs & Import Guide', icon: <Globe className="w-6 h-6 text-indigo-600" /> };
      case 'guide':
        return { title: 'Platform Guide', icon: <BookOpen className="w-6 h-6 text-indigo-600" /> };
      case 'pricing':
        return { title: 'Pricing Rate Calculator', icon: <Calculator className="w-6 h-6 text-indigo-600" /> };
      case 'help':
        return { title: 'Help Center & FAQs', icon: <HelpCircle className="w-6 h-6 text-indigo-600" /> };
      case 'support':
        return { title: 'Contact Customer Support', icon: <MessageSquare className="w-6 h-6 text-indigo-600" /> };
    }
  };

  const { title, icon } = getHeaderInfo();

  // Support WhatsApp submission handler
  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportName || !supportPhone || !supportMessage) return;

    const simulatedText = 
      `🙋‍♂️ *New BorderBuy Support Inquiry!*\n\n` +
      `👤 *Name:* ${supportName}\n` +
      `📞 *WhatsApp:* ${supportPhone}\n` +
      `🏷️ *Topic:* ${supportTopic}\n\n` +
      `💬 *Message:*\n${supportMessage}`;

    const cleanPhone = adminPhone.replace(/\D/g, '');
    const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(simulatedText)}`;
    
    // Redirect support
    window.open(waLink, '_blank');
    setSupportSuccess(true);
  };

  // FAQ contents
  const faqs = [
    {
      q: 'Is there a Cash on Delivery (COD) option?',
      a: 'Yes! We offer Cash on Delivery (COD) for orders under ₨5,000 NPR in Nepalgunj and major parts of Kathmandu. For high-value orders or items above ₨5,000 NPR, we require a partial advance payment of 20% to 50% through Esewa, Khalti, or direct Bank Transfer to secure the purchase from India.'
    },
    {
      q: 'How long does shipping and delivery take?',
      a: 'Typically, it takes 3 to 5 business days for packages to arrive at our Nepalgunj hub. From there, local deliveries in Nepalgunj are completed the same day, while other cities (like Kathmandu, Pokhara, Lalitpur, and Butwal) take an additional 2 to 4 business days via courier.'
    },
    {
      q: 'Which Indian sites can I order products from?',
      a: 'You can order from virtually any Indian shopping website! Our automated calculator is optimized for Amazon.in, Flipkart.com, Myntra.com, Meesho.com, Ajio.com, and Nykaa.com. For other websites, you can still paste the URL and our admins will manually check the pricing for you.'
    },
    {
      q: 'Are there any extra customs duties or hidden charges?',
      a: 'Absolutely not. The estimated total price shown on our calculator includes standard import charges, custom clearances, and handling fees. You only pay what you see on the estimation summary.'
    },
    {
      q: 'What is your return policy if the product is damaged or wrong?',
      a: 'Since we purchase on your behalf from Indian retailers, we honor the original seller\'s return policy window (usually 7-10 days). If a product is defective or incorrect, you must send it back to our Nepalgunj hub within the retailer\'s return window. We will coordinate the exchange/refund with the merchant. Note: Local return shipping costs inside Nepal are the buyer\'s responsibility.'
    },
    {
      q: 'Is there any weight limit for standard shipments?',
      a: 'Yes, our standard pricing fees cover items up to 2.5 kg. Extremely heavy or bulky items (such as home appliances, weights, large furniture) are subject to customized shipping charges which are coordinated on WhatsApp before ordering.'
    }
  ];

  const filteredFaqs = faqs.filter(faq => 
    faq.q.toLowerCase().includes(faqSearch.toLowerCase()) || 
    faq.a.toLowerCase().includes(faqSearch.toLowerCase())
  );

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-8"
      onClick={onClose}
    >
      {/* Dark Overlay Background */}
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-md transition-opacity duration-300" />

      {/* Modal Container */}
      <div 
        className="relative w-full max-w-2xl bg-white/95 rounded-t-3xl sm:rounded-3xl border-t sm:border border-slate-200/80 shadow-2xl overflow-hidden flex flex-col h-[85vh] sm:h-auto max-h-[92vh] sm:max-h-[85vh] transition-all duration-300 transform scale-100 animate-in fade-in-50 slide-in-from-bottom-10 sm:zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              {icon}
            </div>
            <h3 className="font-extrabold text-base sm:text-lg text-slate-800 tracking-tight">{title}</h3>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Modal Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 text-slate-650 leading-relaxed text-xs sm:text-sm">
          
          {/* TERMS OF SERVICE */}
          {activeModal === 'terms' && (
            <div className="space-y-5">
              <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 flex items-start gap-3">
                <Info className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-indigo-700 font-semibold leading-normal">
                  By placing an order on BorderBuy, you acknowledge and agree that BorderBuy operates as a shopping forwarding and logistics facilitation service between India and Nepal.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-sm">1. Ordering & Proxy Purchasing</h4>
                <p>
                  BorderBuy acts as your agent in India. We purchase products from the URLs you submit (e.g. Amazon, Flipkart, Myntra) on your behalf. We do not manufacture, inspect inside sealed factory boxes, or warrant the quality of the products directly.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-sm">2. Price Conversion & Fees</h4>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li><strong>Exchange Rate:</strong> Standard billing conversion rate is locked at <span className="font-bold text-slate-800">1 INR = 1.6 NPR</span>.</li>
                  <li><strong>Service Charge:</strong> Calculated based on the product price in INR and the delivery city:
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      <li><strong>Within Nepalgunj:</strong> 5% for items up to ₹5,000 INR; 3% for items between ₹5,001 and ₹10,000 INR; 2% for items above ₹10,000 INR.</li>
                      <li><strong>Other Locations in Nepal:</strong> 8% for items up to ₹5,000 INR; 5% for items between ₹5,001 and ₹10,000 INR; 3% for items above ₹10,000 INR.</li>
                    </ul>
                  </li>
                  <li><strong>Delivery Charges:</strong> Flat fee of NPR 150 in Nepalgunj; NPR 400 for delivery to all other locations across Nepal.</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-sm">3. Order Confirmation & Payment</h4>
                <p>
                  No order is finalized or purchased until you click the checkout button and confirm the order details with our support executives on WhatsApp. Orders under NPR 5,000 can be processed via Cash on Delivery (COD). Orders above NPR 5,000 require an advance payment ranging from 20% to 50% of the total estimate before we buy the item in India.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-sm">4. Returns & Defect Management</h4>
                <p>
                  If you receive a product that is defective, incorrect, or damaged from the Indian seller:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>You must inform us within 48 hours of receiving the shipment.</li>
                  <li>We will coordinate with the original seller for refunds/replacements based on their official policy window.</li>
                  <li>The product must be delivered back to our Nepalgunj hub at your cost to be sent back to India.</li>
                </ul>
              </div>
            </div>
          )}

          {/* PRIVACY POLICY */}
          {activeModal === 'privacy' && (
            <div className="space-y-5">
              <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-700 font-semibold leading-normal">
                  Your privacy is highly valued. We only collect the minimal information needed to process your proxy purchases and deliver them safely to your address in Nepal.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-sm">1. Information We Collect</h4>
                <p>To process your order, we collect:</p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li><strong>Personal details:</strong> Your Name, WhatsApp phone number, and Shipping Address in Nepal.</li>
                  <li><strong>Product Details:</strong> The product URL, title, price, and image fetched from the e-commerce source site.</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-sm">2. How We Use Your Data</h4>
                <p>
                  Your information is solely used to compile pricing details, generate checkout links, and communicate directly with you over WhatsApp. We do not maintain user databases for marketing, sell customer lists, or send unsolicited emails/messages.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-sm">3. Data Storage & Security</h4>
                <p>
                  No payment card information or bank logins are processed or stored on our servers. All transactions happen through official messaging channels (WhatsApp) or banking gateways (eSewa/Khalti/IPS). Customer records are kept temporarily for delivery tracking and dispute resolution, and are archived after 60 days.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-sm">4. Cookies & Trackers</h4>
                <p>
                  We only use basic local cookies to cache your selected city (e.g. Nepalgunj vs. Kathmandu) and keep your ongoing estimation wizard step in memory so you don't lose progress if you accidentally refresh the page.
                </p>
              </div>
            </div>
          )}

          {/* CUSTOMS & IMPORT GUIDE */}
          {activeModal === 'customs' && (
            <div className="space-y-5">
              <p>
                Importing products from India to Nepal involves border custom inspections, tax declarations, and cargo handling. BorderBuy simplifies this entire workflow for you.
              </p>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-sm">How Custom Handling Works</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="text-xs font-bold text-indigo-600 block mb-1">STEP 1</span>
                    <h5 className="font-bold text-slate-800 text-xs mb-1">Receipt in India</h5>
                    <p className="text-[11px] text-slate-500 leading-normal">Your order arrives at our border warehouse on the Indian side.</p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="text-xs font-bold text-indigo-600 block mb-1">STEP 2</span>
                    <h5 className="font-bold text-slate-800 text-xs mb-1">Custom Clearance</h5>
                    <p className="text-[11px] text-slate-500 leading-normal">Our import agents pay the duties and clear customs at the checkpost.</p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="text-xs font-bold text-indigo-600 block mb-1">STEP 3</span>
                    <h5 className="font-bold text-slate-800 text-xs mb-1">Nepal Dispatch</h5>
                    <p className="text-[11px] text-slate-500 leading-normal">Packages are sorted at our Nepalgunj hub and courier-shipped.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-slate-900 text-sm">Prohibited & Restricted Items</h4>
                <p className="text-xs text-slate-500 mb-2">We cannot import the following classes of products due to Nepal custom laws:</p>
                
                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full border-collapse text-left text-xs min-w-[500px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="p-2.5 font-bold text-slate-800 border-r border-slate-200 w-1/3">Classification</th>
                        <th className="p-2.5 font-bold text-slate-800">Prohibited Items List</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-150">
                        <td className="p-2.5 font-bold text-rose-700 bg-rose-50/30 border-r border-slate-200">Dangerous Goods</td>
                        <td className="p-2.5 text-slate-600">Flammable liquids, gas cylinders, matches, batteries, aerosols, firecrackers.</td>
                      </tr>
                      <tr className="border-b border-slate-150">
                        <td className="p-2.5 font-bold text-rose-700 bg-rose-50/30 border-r border-slate-200">High-Value Metals</td>
                        <td className="p-2.5 text-slate-600">Raw gold, silver bars, loose precious gemstones (restricted unless declared by bank).</td>
                      </tr>
                      <tr className="border-b border-slate-150">
                        <td className="p-2.5 font-bold text-amber-700 bg-amber-50/30 border-r border-slate-200">Restricted Products</td>
                        <td className="p-2.5 text-slate-600">Liquids in large volume, seeds, raw plants, medicines (requires prescription details).</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-rose-700 bg-rose-50/30 border-r border-slate-200">Illegal Sub.</td>
                        <td className="p-2.5 text-slate-600">Narcotics, psychotropic substances, unauthorized communication gear.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* PLATFORM GUIDE */}
          {activeModal === 'guide' && (
            <div className="space-y-6">
              <p className="text-center font-medium text-slate-700">
                How does BorderBuy work? Follow these 5 simple steps to get started!
              </p>

              {/* Progress Stepper indicator */}
              <div className="flex justify-between items-center max-w-md mx-auto relative mb-6">
                <div className="absolute left-0 right-0 h-0.5 bg-slate-200 top-1/2 -translate-y-1/2 z-0" />
                <div 
                  className="absolute left-0 h-0.5 bg-indigo-600 top-1/2 -translate-y-1/2 z-0 transition-all duration-300"
                  style={{ width: `${((guideStep - 1) / 4) * 100}%` }}
                />
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    onClick={() => setGuideStep(num)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs relative z-10 transition-all duration-200 ${
                      guideStep === num 
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-150 scale-110'
                        : guideStep > num 
                          ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' 
                          : 'bg-white text-slate-450 border border-slate-200'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>

              {/* Step content */}
              <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col items-center text-center space-y-3 min-h-[160px] justify-center transition-all duration-200">
                {guideStep === 1 && (
                  <>
                    <span className="text-3xl">🔗</span>
                    <h5 className="font-extrabold text-slate-800">Step 1: Copy Product Link</h5>
                    <p className="text-xs text-slate-500 max-w-sm">
                      Go to Amazon.in, Flipkart, Meesho, or any Indian online shop. Find the product you like and copy the URL link from your browser.
                    </p>
                  </>
                )}
                {guideStep === 2 && (
                  <>
                    <span className="text-3xl">📋</span>
                    <h5 className="font-extrabold text-slate-800">Step 2: Paste & Calculate</h5>
                    <p className="text-xs text-slate-500 max-w-sm">
                      Return to BorderBuy, paste the link in our search field, choose your target delivery city, and click "Get Price".
                    </p>
                  </>
                )}
                {guideStep === 3 && (
                  <>
                    <span className="text-3xl">📊</span>
                    <h5 className="font-extrabold text-slate-800">Step 3: Review Transparent Estimates</h5>
                    <p className="text-xs text-slate-500 max-w-sm">
                      See the complete breakdown: exchange conversion (1.6), our service fee, customs handling, and local Nepalese delivery fees. No surprises.
                    </p>
                  </>
                )}
                {guideStep === 4 && (
                  <>
                    <span className="text-3xl">✍️</span>
                    <h5 className="font-extrabold text-slate-800">Step 4: Provide Delivery Details</h5>
                    <p className="text-xs text-slate-500 max-w-sm">
                      Fill out your delivery name, address, and active WhatsApp phone number so we can process and track the shipment.
                    </p>
                  </>
                )}
                {guideStep === 5 && (
                  <>
                    <span className="text-3xl">💬</span>
                    <h5 className="font-extrabold text-slate-800">Step 5: Checkout on WhatsApp</h5>
                    <p className="text-xs text-slate-500 max-w-sm">
                      Click the confirmation button to automatically load your preformatted order details onto WhatsApp. Send the message to finalize purchase instructions!
                    </p>
                  </>
                )}
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setGuideStep(prev => Math.max(1, prev - 1))}
                  disabled={guideStep === 1}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => setGuideStep(prev => Math.min(5, prev + 1))}
                  disabled={guideStep === 5}
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-750 disabled:opacity-40 shadow-sm"
                >
                  Next Step
                </button>
              </div>
            </div>
          )}

          {/* PRICING RATE CALCULATOR */}
          {activeModal === 'pricing' && (
            <div className="space-y-6">
              <p className="text-center text-slate-650">
                Understand exchange conversions and estimate prices instantly using our live calculation rates.
              </p>

              {/* Exchange rates info row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center">
                  <span className="text-xs text-slate-400 font-bold block mb-1">EXCHANGE RATE</span>
                  <div className="flex items-center justify-center gap-1.5 text-indigo-700 font-extrabold text-base">
                    <Coins className="w-4 h-4 text-indigo-500" />
                    <span>₹1 INR = ₨1.60 NPR</span>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center">
                  <span className="text-xs text-slate-400 font-bold block mb-1">SERVICE CHARGE</span>
                  <span className="text-slate-800 font-extrabold text-xs sm:text-sm">
                    2%-5% <span className="text-[10px] font-normal text-slate-500">Nplgunj</span> / 3%-8% <span className="text-[10px] font-normal text-slate-500">Other</span>
                  </span>
                </div>
              </div>

              {/* Calculator input section */}
              <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-4">
                <h5 className="font-bold text-slate-900 text-sm">Interactive Cost Estimation</h5>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-450 block mb-1.5 uppercase">Indian Price (INR):</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-sm font-extrabold text-slate-400">₹</span>
                      <input 
                        type="number"
                        value={inrInput}
                        onChange={(e) => setInrInput(e.target.value)}
                        className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-850 focus:outline-indigo-500"
                        min="1"
                        placeholder="e.g. 5000"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-450 block mb-1.5 uppercase">Delivery Destination:</label>
                    <select
                      value={calcCity}
                      onChange={(e) => setCalcCity(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-indigo-500 cursor-pointer"
                    >
                      <option value="Nepalgunj">Nepalgunj (Local Hub)</option>
                      <option value="Other">Other Cities (Kathmandu, Pokhara, etc.)</option>
                    </select>
                  </div>
                </div>

                {/* Calculation Output Breakdown */}
                <div className="border-t border-slate-100 pt-4 space-y-2.5">
                  <div className="flex justify-between text-xs font-medium text-slate-500">
                    <span>Base converted price (INR × 1.6):</span>
                    <span className="font-semibold text-slate-700">₨{calcResult.nprConverted.toLocaleString()} NPR</span>
                  </div>
                  <div className="flex justify-between text-xs font-medium text-slate-500">
                    <span>Service Fee ({Math.round(calcResult.servicePercent * 100)}%):</span>
                    <span className="font-semibold text-slate-700">₨{calcResult.serviceFee.toLocaleString()} NPR</span>
                  </div>
                  <div className="flex justify-between text-xs font-medium text-slate-500">
                    <span>Shipping & Delivery charge:</span>
                    <span className="font-semibold text-slate-700">₨{calcResult.deliveryFee.toLocaleString()} NPR</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm font-extrabold text-slate-900 border-t border-dashed border-slate-200 pt-3 mt-1 bg-indigo-50/20 -mx-5 px-5 py-2.5 rounded-b-2xl">
                    <span className="text-indigo-750">Estimated Grand Total:</span>
                    <span className="text-base text-indigo-650">₨{calcResult.totalNpr.toLocaleString()} NPR</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* HELP CENTER & FAQS */}
          {activeModal === 'help' && (
            <div className="space-y-5">
              {/* FAQ Search Bar */}
              <div className="relative flex items-center">
                <Search className="absolute left-3 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search questions (e.g., delivery, cash, payment...)"
                  value={faqSearch}
                  onChange={(e) => setFaqSearch(e.target.value)}
                  className="w-full pl-8.5 pr-4 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50"
                />
              </div>

              {/* FAQ Accordion List */}
              {filteredFaqs.length > 0 ? (
                <div className="space-y-3.5">
                  {filteredFaqs.map((faq, idx) => {
                    const isExpanded = expandedFaq === idx;
                    return (
                      <div 
                        key={idx}
                        className="border border-slate-150 rounded-2xl overflow-hidden hover:border-slate-300 transition-colors"
                      >
                        <button
                          onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                          className="w-full text-left px-5 py-4 bg-slate-50/50 flex items-center justify-between gap-3 font-bold text-xs sm:text-sm text-slate-800 hover:bg-slate-100/50 transition-colors"
                        >
                          <span>{faq.q}</span>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </button>
                        {isExpanded && (
                          <div className="px-5 py-4 border-t border-slate-100 bg-white text-xs sm:text-sm text-slate-650 leading-relaxed font-normal">
                            {faq.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No answers matched your search terms.</p>
                </div>
              )}
            </div>
          )}

          {/* CONTACT SUPPORT */}
          {activeModal === 'support' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Direct Support Hotline</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">
                  Need direct assistance? Send a message to our support hotline at <a href={`https://wa.me/${adminPhone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-indigo-650 font-bold hover:underline">{adminPhone}</a>, or submit the inquiry details form below:
                </p>
              </div>

              {/* Support stats banner */}
              <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <div className="flex flex-col items-center justify-center text-center p-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center mb-1">
                    <Clock className="w-4 h-4 text-indigo-600" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Response Time</span>
                  <span className="text-xs font-extrabold text-slate-800 mt-0.5">&lt; 15 Mins</span>
                </div>
                <div className="flex flex-col items-center justify-center text-center p-2 border-x border-slate-200">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center mb-1">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Availability</span>
                  <span className="text-xs font-extrabold text-emerald-705 mt-0.5">Online Now</span>
                </div>
                <div className="flex flex-col items-center justify-center text-center p-2">
                  <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center mb-1">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 tracking-wide uppercase">WhatsApp</span>
                  <span className="text-[10px] font-extrabold text-purple-700 mt-0.5">{adminPhone}</span>
                </div>
              </div>

              {supportSuccess ? (
                <div className="py-8 flex flex-col items-center text-center space-y-4 animate-in fade-in zoom-in-95">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shadow-lg shadow-emerald-50/50 animate-pulse">
                    <CheckCircle className="w-10 h-10 text-emerald-500 animate-bounce" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-lg">Inquiry Sent to WhatsApp!</h4>
                    <p className="text-xs text-slate-500 max-w-sm leading-normal mt-1">
                      Your support request details have been prepared. If the WhatsApp redirect didn't launch automatically, please click below to chat with us:
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const simulatedText = 
                        `🙋‍♂️ *New BorderBuy Support Inquiry!*\n\n` +
                        `👤 *Name:* ${supportName}\n` +
                        `📞 *WhatsApp:* ${supportPhone}\n` +
                        `🏷️ *Topic:* ${supportTopic}\n\n` +
                        `💬 *Message:*\n${supportMessage}`;
                      const cleanPhone = adminPhone.replace(/\D/g, '');
                      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(simulatedText)}`, '_blank');
                    }}
                    className="px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-655 hover:from-emerald-600 hover:to-emerald-700 text-white font-extrabold rounded-2xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-150 transition-all hover:scale-103 active:scale-97 cursor-pointer"
                  >
                    Open WhatsApp Support Chat
                    <Send className="w-4 h-4 animate-pulse" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSupportSubmit} className="space-y-4">
                  {/* Name and Phone Input Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Your Full Name</label>
                      <div className="relative flex items-center">
                        <User className="absolute left-3 w-4 h-4 text-slate-400" />
                        <input 
                          type="text"
                          required
                          value={supportName}
                          onChange={(e) => setSupportName(e.target.value)}
                          placeholder="e.g. Aashish Sharma"
                          className="w-full pl-8.5 pr-4 py-2 sm:py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-850 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">WhatsApp Number</label>
                      <div className="relative flex items-center">
                        <Phone className="absolute left-3 w-4 h-4 text-slate-400" />
                        <input 
                          type="text"
                          required
                          value={supportPhone}
                          onChange={(e) => setSupportPhone(e.target.value)}
                          placeholder="e.g. +977 98XXXXXXXX"
                          className="w-full pl-8.5 pr-4 py-2 sm:py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-850 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Visual Topic Selection Grid */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Topic of Inquiry</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'Order Issue', title: 'Active Order', desc: 'Tracking & order updates', icon: <ShoppingBag className="w-4.5 h-4.5" />, colorClass: 'indigo' },
                        { id: 'Price Estimation', title: 'Pricing Inquiry', desc: 'Calculator or rate issues', icon: <Calculator className="w-4.5 h-4.5" />, colorClass: 'amber' },
                        { id: 'Delivery Delay', title: 'Delivery/Delay', desc: 'Shipping delays & issues', icon: <Zap className="w-4.5 h-4.5" />, colorClass: 'rose' },
                        { id: 'General Inquiry', title: 'General Question', desc: 'Other general support', icon: <HelpCircle className="w-4.5 h-4.5" />, colorClass: 'teal' }
                      ].map((t) => {
                        const isSelected = supportTopic === t.id;
                        
                        // Custom styled borders and backgrounds based on selection
                        let selectClasses = 'border-slate-200 hover:border-slate-350 hover:bg-slate-50/50';
                        let badgeBg = 'bg-slate-100 text-slate-500';
                        
                        if (isSelected) {
                          if (t.colorClass === 'indigo') {
                            selectClasses = 'border-indigo-500 bg-indigo-50/20 ring-2 ring-indigo-100/50 shadow-md shadow-indigo-100/30';
                            badgeBg = 'bg-indigo-500 text-white';
                          } else if (t.colorClass === 'amber') {
                            selectClasses = 'border-amber-500 bg-amber-50/20 ring-2 ring-amber-100/50 shadow-md shadow-amber-100/30';
                            badgeBg = 'bg-amber-500 text-white';
                          } else if (t.colorClass === 'rose') {
                            selectClasses = 'border-rose-500 bg-rose-50/20 ring-2 ring-rose-100/50 shadow-md shadow-rose-100/30';
                            badgeBg = 'bg-rose-500 text-white';
                          } else if (t.colorClass === 'teal') {
                            selectClasses = 'border-teal-500 bg-teal-50/20 ring-2 ring-teal-100/50 shadow-md shadow-teal-100/30';
                            badgeBg = 'bg-teal-500 text-white';
                          }
                        }

                        return (
                          <div
                            key={t.id}
                            onClick={() => setSupportTopic(t.id)}
                            className={`p-2.5 border rounded-xl flex flex-col justify-between text-left cursor-pointer transition-all duration-300 relative select-none ${selectClasses}`}
                          >
                            {isSelected && (
                              <span className="absolute top-2 right-2 w-3.5 h-3.5 bg-emerald-500 text-white rounded-full flex items-center justify-center">
                                <Check className="w-2 h-2 stroke-[3]" />
                              </span>
                            )}
                            <div>
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-1.5 ${badgeBg}`}>
                                {t.icon}
                              </div>
                              <h5 className="font-extrabold text-slate-800 text-xs tracking-tight">{t.title}</h5>
                              <p className="text-[9px] text-slate-450 mt-0.5 leading-tight">{t.desc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Message Field */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Message Description</label>
                    <div className="relative">
                      <textarea 
                        required
                        value={supportMessage}
                        onChange={(e) => setSupportMessage(e.target.value)}
                        placeholder="Write your support request details here..."
                        rows={3}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-850 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none resize-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-indigo-650 via-violet-600 to-purple-600 hover:scale-101 active:scale-99 text-white font-extrabold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-200/50 hover:shadow-indigo-300/60 transition-all cursor-pointer"
                  >
                    Submit Inquiry & Open WhatsApp
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </button>
                </form>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
