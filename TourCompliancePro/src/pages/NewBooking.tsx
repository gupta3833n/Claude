import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Users, MapPin, CreditCard, FileText, Check } from 'lucide-react';
import { clsx } from 'clsx';

const steps = [
  { id: 'client', name: 'Client', icon: Users },
  { id: 'trip', name: 'Trip Details', icon: MapPin },
  { id: 'pricing', name: 'Pricing', icon: CreditCard },
  { id: 'review', name: 'Review', icon: FileText }
];

export default function NewBooking() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/bookings')}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-800 dark:text-white">
            New Booking
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Create a new tour booking with automatic tax calculations
          </p>
        </div>
      </div>

      {/* Stepper */}
      <div className="card">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;

            return (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => index <= currentStep && setCurrentStep(index)}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-2 rounded-lg transition-all',
                    isCompleted && 'text-success-600 dark:text-success-400',
                    isCurrent && 'bg-primary-50 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400',
                    !isCompleted && !isCurrent && 'text-slate-400'
                  )}
                  disabled={index > currentStep}
                >
                  <div className={clsx(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                    isCompleted && 'bg-success-100 dark:bg-success-500/30',
                    isCurrent && 'bg-primary-100 dark:bg-primary-500/30',
                    !isCompleted && !isCurrent && 'bg-slate-100 dark:bg-slate-700'
                  )}>
                    {isCompleted ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span className="hidden sm:inline font-medium">{step.name}</span>
                </button>
                {index < steps.length - 1 && (
                  <div className={clsx(
                    'hidden sm:block w-12 h-0.5 mx-2',
                    index < currentStep ? 'bg-success-500' : 'bg-slate-200 dark:bg-slate-700'
                  )} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Form content */}
      <div className="card">
        {currentStep === 0 && (
          <div className="space-y-6">
            <h2 className="text-lg font-display font-semibold text-slate-800 dark:text-white">
              Select or Create Client
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Client Name *</label>
                <input type="text" className="input" placeholder="Enter client name" />
              </div>
              <div>
                <label className="label">Phone Number *</label>
                <input type="tel" className="input" placeholder="+91" />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" placeholder="client@email.com" />
              </div>
              <div>
                <label className="label">GSTIN (if registered)</label>
                <input type="text" className="input" placeholder="27AAPFU0939F1Z5" />
              </div>
              <div>
                <label className="label">PAN</label>
                <input type="text" className="input" placeholder="AAPFU0939F" />
              </div>
              <div>
                <label className="label">Client Type</label>
                <select className="input">
                  <option>Individual</option>
                  <option>Business</option>
                  <option>Government</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="space-y-6">
            <h2 className="text-lg font-display font-semibold text-slate-800 dark:text-white">
              Trip Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label">Destination *</label>
                <input type="text" className="input" placeholder="e.g., Dubai, Singapore, Europe" />
              </div>
              <div>
                <label className="label">Trip Type *</label>
                <select className="input">
                  <option value="INTERNATIONAL">International (TCS Applicable)</option>
                  <option value="DOMESTIC">Domestic (No TCS)</option>
                </select>
              </div>
              <div>
                <label className="label">Supply Type *</label>
                <select className="input">
                  <option value="DIRECT">Direct Supply (Full GST)</option>
                  <option value="PURE_AGENT">Pure Agent (GST on Service Fee only)</option>
                </select>
              </div>
              <div>
                <label className="label">Departure Date *</label>
                <input type="date" className="input" />
              </div>
              <div>
                <label className="label">Return Date *</label>
                <input type="date" className="input" />
              </div>
            </div>

            <div>
              <h3 className="text-md font-medium text-slate-800 dark:text-white mb-3">
                Travelers
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Add travelers with their date of birth. Adults (18+) can pay cash up to ₹2,00,000 each.
              </p>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <div>
                    <label className="label">Name *</label>
                    <input type="text" className="input" placeholder="Traveler name" />
                  </div>
                  <div>
                    <label className="label">Date of Birth *</label>
                    <input type="date" className="input" />
                  </div>
                  <div>
                    <label className="label">Passport No.</label>
                    <input type="text" className="input" placeholder="A1234567" />
                  </div>
                </div>
                <button className="btn btn-secondary">
                  <Users className="w-4 h-4" />
                  Add Another Traveler
                </button>
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <h2 className="text-lg font-display font-semibold text-slate-800 dark:text-white">
              Pricing & Components
            </h2>
            <div className="bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/30 rounded-lg p-4">
              <p className="text-sm text-primary-700 dark:text-primary-300">
                <strong>Smart Pricing:</strong> Add your cost components and we'll automatically calculate
                GST, TCS, and suggest compliant cash payment limits.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                <div>
                  <label className="label">Component *</label>
                  <input type="text" className="input" placeholder="e.g., Flight Tickets" />
                </div>
                <div>
                  <label className="label">Cost Price *</label>
                  <input type="number" className="input" placeholder="₹" />
                </div>
                <div>
                  <label className="label">Markup %</label>
                  <input type="number" className="input" placeholder="10" />
                </div>
                <div>
                  <label className="label">Pure Agent?</label>
                  <select className="input">
                    <option value="no">No (Direct Supply)</option>
                    <option value="yes">Yes (Pure Agent)</option>
                  </select>
                </div>
              </div>
              <button className="btn btn-secondary">
                Add Component
              </button>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
              <h3 className="text-md font-medium text-slate-800 dark:text-white mb-3">
                Tax Summary (Auto-calculated)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Subtotal</p>
                  <p className="text-lg font-display font-bold text-slate-800 dark:text-white">₹0</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <p className="text-xs text-slate-500 dark:text-slate-400">GST (18%)</p>
                  <p className="text-lg font-display font-bold text-slate-800 dark:text-white">₹0</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <p className="text-xs text-slate-500 dark:text-slate-400">TCS</p>
                  <p className="text-lg font-display font-bold text-slate-800 dark:text-white">₹0</p>
                </div>
                <div className="p-3 bg-primary-50 dark:bg-primary-500/20 rounded-lg">
                  <p className="text-xs text-primary-600 dark:text-primary-400">Grand Total</p>
                  <p className="text-lg font-display font-bold text-primary-700 dark:text-primary-300">₹0</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            <h2 className="text-lg font-display font-semibold text-slate-800 dark:text-white">
              Review Booking
            </h2>
            <div className="bg-success-50 dark:bg-success-500/10 border border-success-200 dark:border-success-500/30 rounded-lg p-4">
              <p className="text-sm text-success-700 dark:text-success-300">
                <strong>All calculations verified!</strong> TCS, GST, and cash limits are compliant.
                Review the details below and confirm.
              </p>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-center py-8">
              Review section will show complete booking summary
            </p>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
          disabled={currentStep === 0}
          className="btn btn-secondary disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" />
          Previous
        </button>

        {currentStep < steps.length - 1 ? (
          <button
            onClick={() => setCurrentStep(prev => prev + 1)}
            className="btn btn-primary"
          >
            Next
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button className="btn btn-success">
            <Check className="w-4 h-4" />
            Create Booking
          </button>
        )}
      </div>
    </div>
  );
}
