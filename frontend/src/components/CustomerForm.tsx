import React, { useState } from 'react';
import { ArrowLeft, AlertCircle } from 'lucide-react';

interface FormData {
  customerName: string;
  whatsappNumber: string;
  address: string;
  city: string;
  notes: string;
}

interface CustomerFormProps {
  onSubmit: (data: FormData) => void;
  onBack: () => void;
  isLoading: boolean;
  estimatedTotal: number;
  selectedCity: string;
  onCityChange: (city: string) => void;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({ onSubmit, onBack, isLoading, estimatedTotal, selectedCity, onCityChange }) => {
  const [formData, setFormData] = useState<FormData>({
    customerName: '',
    whatsappNumber: '',
    address: '',
    city: '',
    notes: '',
  });

  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const { customerName, whatsappNumber, address } = formData;
    const city = selectedCity;

    if (!customerName.trim() || !whatsappNumber.trim() || !address.trim() || !city.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    // Basic WhatsApp phone number format check (typically 10 digits for Nepal numbers e.g. 98xxxxxxxx or international formats)
    const phoneDigits = whatsappNumber.replace(/\D/g, '');
    if (phoneDigits.length < 9 || phoneDigits.length > 15) {
      setError('Please enter a valid WhatsApp phone number (e.g. 98XXXXXXXX).');
      return;
    }

    if (!agreed) {
      setError('You must agree to the estimated pricing to proceed.');
      return;
    }

    onSubmit({ ...formData, city });
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-8 animate-fade-in">
      {/* Step Indicator */}
      <div className="flex justify-between items-center mb-8 text-xs sm:text-sm text-slate-400 font-medium max-w-xs mx-auto px-2">
        <span className="text-slate-650">1. Estimate</span>
        <span className="w-6 sm:w-12 h-px bg-slate-205"></span>
        <span className="text-indigo-600 font-semibold">2. Info</span>
        <span className="w-6 sm:w-12 h-px bg-slate-205"></span>
        <span>3. Confirm</span>
      </div>

      <h2 className="text-3xl font-extrabold text-slate-900 text-center mb-2">
        Delivery Information
      </h2>
      <p className="text-slate-500 text-sm text-center mb-8">
        We need your details to coordinate delivery and notify you when the items arrive.
      </p>

      {/* Main Form Card */}
      <div className="bg-white rounded-3xl p-6 md:p-8 mb-6 card-3d">
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Full Name */}
          <div>
            <label htmlFor="customerName" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              id="customerName"
              name="customerName"
              value={formData.customerName}
              onChange={handleChange}
              placeholder="e.g. Ram Bahadur"
              className="w-full px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-55 transition-all text-slate-850 text-sm sm:text-base"
              disabled={isLoading}
            />
          </div>

          {/* WhatsApp Number */}
          <div>
            <label htmlFor="whatsappNumber" className="block text-sm font-semibold text-slate-700 mb-1.5">
              WhatsApp Number <span className="text-rose-500">*</span>
            </label>
            <input
              type="tel"
              id="whatsappNumber"
              name="whatsappNumber"
              value={formData.whatsappNumber}
              onChange={handleChange}
              placeholder="e.g. 9801234567"
              className="w-full px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-55 transition-all text-slate-850 text-sm sm:text-base"
              disabled={isLoading}
            />
            <p className="text-xs text-slate-400 mt-1">We'll contact you here to finalize the delivery details.</p>
          </div>

          {/* Delivery Address */}
          <div>
            <label htmlFor="address" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Delivery Address <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="e.g. House No. 12, Ward 3, New Baneshwor"
              className="w-full px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-55 transition-all text-slate-850 text-sm sm:text-base"
              disabled={isLoading}
            />
          </div>

          {/* City */}
          <div>
            <label htmlFor="city" className="block text-sm font-semibold text-slate-700 mb-1.5">
              City <span className="text-rose-500">*</span>
            </label>
            <select
              id="city"
              name="city"
              value={selectedCity}
              onChange={(e) => onCityChange(e.target.value)}
              className="w-full px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-55 transition-all text-slate-850 bg-white font-medium text-sm sm:text-base cursor-pointer"
              disabled={isLoading}
            >
              <option value="">Select your city</option>
              <option value="Nepalgunj">Nepalgunj (Local - Delivery: ₨150)</option>
              <option value="Kathmandu">Kathmandu (Outer - Delivery: ₨400)</option>
              <option value="Lalitpur">Lalitpur (Outer - Delivery: ₨400)</option>
              <option value="Bhaktapur">Bhaktapur (Outer - Delivery: ₨400)</option>
              <option value="Pokhara">Pokhara (Outer - Delivery: ₨400)</option>
              <option value="Biratnagar">Biratnagar (Outer - Delivery: ₨400)</option>
              <option value="Butwal">Butwal (Outer - Delivery: ₨400)</option>
              <option value="Dharan">Dharan (Outer - Delivery: ₨400)</option>
              <option value="Chitwan">Chitwan (Outer - Delivery: ₨400)</option>
              <option value="Other">Other (Specify in Notes - Delivery: ₨400)</option>
            </select>
          </div>

          {/* Additional Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Additional Notes <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Color, size preferences, or specific delivery instructions..."
              rows={3}
              className="w-full px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-55 transition-all text-slate-850 text-sm sm:text-base resize-none"
              disabled={isLoading}
            />
          </div>

          {/* Pricing Agreement Checkbox */}
          <div className="pt-2">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 w-4 h-4 text-indigo-650 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                disabled={isLoading}
              />
              <span className="text-sm text-slate-650 select-none leading-snug">
                I agree with the estimated pricing of <span className="font-bold text-slate-800">NPR ₨{estimatedTotal.toLocaleString('en-NP')}</span>.
              </span>
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-100 flex items-center gap-2.5 text-sm text-rose-700 font-medium">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit & Back Buttons */}
          <div className="flex gap-4 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onBack}
              disabled={isLoading}
              className="px-5 py-3.5 rounded-2xl text-slate-700 font-bold transition-all duration-105 flex items-center justify-center gap-2 disabled:opacity-50 btn-3d-slate"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-3.5 text-white rounded-2xl font-bold transition-all duration-105 flex items-center justify-center gap-2 disabled:opacity-85 btn-3d-indigo"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Placing Order...
                </>
              ) : (
                <>
                  Confirm Order
                  <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
export default CustomerForm;
