import React from 'react';
import { ArrowRight, ArrowLeft, Info, HelpCircle } from 'lucide-react';

interface PriceDetails {
  productUrl: string;
  productName: string;
  productImage: string;
  indianPriceINR: number;
  exchangeRate: number;
  serviceChargeNPR: number;
  deliveryChargeNPR: number;
  estimatedPriceNPR: number;
}

interface PriceEstimationProps {
  details: PriceDetails;
  onNext: () => void;
  onBack: () => void;
}

export const PriceEstimation: React.FC<PriceEstimationProps> = ({ details, onNext, onBack }) => {
  const originalInrToNpr = details.indianPriceINR * details.exchangeRate;

  return (
    <div className="w-full max-w-xl mx-auto px-3 sm:px-4 py-4 sm:py-8 animate-fade-in">
      {/* Step Indicator */}
      <div className="flex justify-between items-center mb-6 sm:mb-8 text-[11px] sm:text-xs text-slate-400 font-medium max-w-xs mx-auto px-2">
        <span className="text-indigo-650 font-bold">1. Estimate</span>
        <span className="w-6 sm:w-12 h-px bg-slate-200"></span>
        <span>2. Info</span>
        <span className="w-6 sm:w-12 h-px bg-slate-200"></span>
        <span>3. Confirm</span>
      </div>

      <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 text-center mb-5 sm:mb-8">
        Your Price Estimate
      </h2>

      {/* Main Container Card */}
      <div className="bg-white rounded-2xl sm:rounded-3xl overflow-hidden mb-6 sm:mb-8 card-3d border border-slate-100/50">
        {/* Product Summary Header */}
        <div className="p-4 sm:p-6 md:p-8 bg-slate-50 border-b border-slate-100 flex flex-row gap-3.5 sm:gap-5 items-center">
          <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-xl sm:rounded-2xl bg-white border border-slate-150 p-1.5 sm:p-2 flex items-center justify-center overflow-hidden shadow-xs flex-shrink-0">
            <img
              src={details.productImage}
              alt={details.productName}
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500';
              }}
            />
          </div>
          
          <div className="flex-1 min-w-0 text-left">
            <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 text-[9px] sm:text-xs font-bold uppercase tracking-wider mb-1 inline-block">
              Product Details
            </span>
            <h3 className="text-xs sm:text-base font-extrabold text-slate-800 truncate mb-0.5" title={details.productName}>
              {details.productName}
            </h3>
            <p className="text-[11px] sm:text-sm font-semibold text-slate-500">
              Indian Price: <span className="text-slate-800">INR ₹{details.indianPriceINR.toLocaleString('en-IN')}</span>
            </p>
          </div>
        </div>

        {/* Pricing breakdown */}
        <div className="p-4 sm:p-6 md:p-8 space-y-3 sm:space-y-4">
          <h4 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Cost Breakdown</h4>
          
          <div className="flex justify-between items-center text-xs sm:text-sm py-0.5">
            <span className="text-slate-500 flex items-center gap-1">
              Product Price (Converted)
              <span className="group relative">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 text-white text-[10px] rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 text-center">
                  ₹{details.indianPriceINR} × exchange rate of {details.exchangeRate}
                </span>
              </span>
            </span>
            <span className="font-bold text-slate-800">
              NPR ₨{originalInrToNpr.toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs sm:text-sm py-0.5">
            <span className="text-slate-500">Exchange Rate</span>
            <span className="font-bold text-slate-800">1 INR = {details.exchangeRate} NPR</span>
          </div>

          <div className="flex justify-between items-center text-xs sm:text-sm py-0.5">
            <span className="text-slate-500 flex items-center gap-1">
              Service Charge ({details.deliveryChargeNPR === 150 ? '5%' : '8%'})
              <span className="group relative">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 text-white text-[10px] rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 text-center">
                  BorderBuy's handling, customs clearance & logistics service fee
                </span>
              </span>
            </span>
            <span className="font-bold text-slate-800">
              NPR ₨{details.serviceChargeNPR.toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs sm:text-sm py-0.5 border-b border-slate-100 pb-3">
            <span className="text-slate-500 flex items-center gap-1">
              Delivery Charge ({details.deliveryChargeNPR === 150 ? 'Nepalgunj' : 'Other Cities'})
              <span className="group relative">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 bg-slate-900 text-white text-[10px] rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 text-center">
                  {details.deliveryChargeNPR === 150 ? 'Local delivery charge within Nepalgunj' : 'Safe delivery cost from India warehouse to Nepal outer cities hub'}
                </span>
              </span>
            </span>
            <span className="font-bold text-slate-800">
              NPR ₨{details.deliveryChargeNPR.toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Prominent Estimated Total */}
          <div className="flex justify-between items-center pt-3">
            <div>
              <span className="text-sm sm:text-base font-bold text-slate-850">Estimated Total</span>
              <p className="text-[9px] sm:text-xs text-slate-400 mt-0.5">Final price is subject to product weight.</p>
            </div>
            <div className="text-right">
              <span className="text-xl sm:text-3xl font-extrabold text-indigo-650">
                NPR ₨{details.estimatedPriceNPR.toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons - side by side on mobile for layout economy */}
      <div className="flex flex-row gap-3 items-center justify-between">
        <button
          onClick={onBack}
          className="flex-1 sm:flex-initial px-4 py-3 sm:px-6 sm:py-3.5 rounded-xl sm:rounded-2xl text-slate-700 text-xs sm:text-sm font-bold transition-all duration-100 flex items-center justify-center gap-1.5 btn-3d-slate"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>

        <button
          onClick={onNext}
          className="flex-[2] sm:flex-initial px-5 py-3 sm:px-8 sm:py-3.5 text-white text-xs sm:text-sm rounded-xl sm:rounded-2xl font-bold transition-all duration-100 flex items-center justify-center gap-1.5 btn-3d-indigo"
        >
          Continue Order
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="mt-6 sm:mt-8 text-center flex items-center justify-center gap-1.5 text-[10px] sm:text-xs text-slate-400 select-none">
        <Info className="w-3.5 h-3.5 text-indigo-500" />
        Need custom assistance? Chat with us at +977 9700998792.
      </div>
    </div>
  );
};
export default PriceEstimation;
