import React, { useState, useEffect } from 'react';
import { Check, MessageSquare, Home } from 'lucide-react';

interface SuccessConfirmationProps {
  orderData: any; // The successfully saved order returned from API
  whatsappPrefilledText: string;
  adminPhone: string;
  onReset: () => void;
}

export const SuccessConfirmation: React.FC<SuccessConfirmationProps> = ({
  orderData,
  whatsappPrefilledText,
  adminPhone,
  onReset,
}) => {
  // Format the WhatsApp link for the customer
  // Clean phone number (remove any leading + for the link structure, although wa.me supports digits only)
  const cleanPhone = adminPhone.replace(/\D/g, '');
  const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappPrefilledText)}`;

  const [particles, setParticles] = useState<Array<{ id: number; x: number; delay: number; duration: number; color: string; size: number }>>([]);

  useEffect(() => {
    const colors = ['#6366f1', '#a855f7', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'];
    const newParticles = Array.from({ length: 65 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100, // percentage position width
      delay: Math.random() * 1.5, // seconds
      duration: 2.2 + Math.random() * 2.2, // seconds
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 5 + Math.random() * 8, // size in pixels
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-8 animate-fade-in text-center relative">
      {/* Confetti Rain Container */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {particles.map((p) => (
          <div
            key={p.id}
            className="confetti-particle"
            style={{
              left: `${p.x}%`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              backgroundColor: p.color,
              width: `${p.size}px`,
              height: `${p.size}px`,
              borderRadius: p.id % 2 === 0 ? '50%' : '15%',
            }}
          />
        ))}
      </div>
      {/* Success Badge */}
      <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-100 shadow-md">
        <Check className="w-10 h-10 stroke-[3]" />
      </div>

      <h2 className="text-3xl font-extrabold text-slate-900 mb-3">
        Order Submitted Successfully
      </h2>
      <p className="text-slate-600 max-w-md mx-auto mb-8 leading-relaxed">
        Thank you! Our team has received your order and will contact you shortly on WhatsApp.
      </p>

      {/* Order Summary Card Receipt */}
      <div className="bg-white rounded-3xl p-6 mb-8 text-left max-w-md mx-auto card-3d">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Order Details</span>
          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-xs font-semibold uppercase tracking-wide border border-amber-100">
            Pending
          </span>
        </div>

        <div className="space-y-3.5 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Customer:</span>
            <span className="font-bold text-slate-850">{orderData?.customerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">WhatsApp:</span>
            <span className="font-semibold text-slate-850">{orderData?.whatsappNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Product Name:</span>
            <span className="font-semibold text-slate-850 text-right max-w-[200px] truncate" title={orderData?.productName}>
              {orderData?.productName}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Estimated Price:</span>
            <span className="font-extrabold text-indigo-600">
              NPR ₨{Number(orderData?.estimatedPriceNPR || 0).toLocaleString('en-NP')}
            </span>
          </div>
        </div>
      </div>

      {/* Direct WhatsApp Call to Action */}
      <div className="max-w-md mx-auto space-y-5">
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-4 px-6 text-white rounded-2xl font-bold transition-all duration-100 flex items-center justify-center gap-2.5 btn-3d-emerald"
        >
          <MessageSquare className="w-5 h-5 fill-white" />
          Chat on WhatsApp to Speed Up
        </a>

        <button
          onClick={onReset}
          className="w-full py-4 px-6 text-slate-700 rounded-2xl font-bold transition-all duration-100 flex items-center justify-center gap-2 btn-3d-slate"
        >
          <Home className="w-4 h-4" />
          Order Another Product
        </button>
      </div>

      <p className="text-xs text-slate-400 mt-8">
        Your order reference has been logged. Need help? Call +977 980-0000000.
      </p>
    </div>
  );
};
export default SuccessConfirmation;
