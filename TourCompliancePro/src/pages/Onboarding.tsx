import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Check, Building2, User, Shield, Palette, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { db, generateId } from '@/lib/db/database';
import { UserRole } from '@/types';
import { defaultPermissions } from '@/components/providers/AuthProvider';
import { toast } from 'sonner';

// Hash PIN using Web Crypto API
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const steps = [
  { id: 'company', name: 'Company', icon: Building2 },
  { id: 'owner', name: 'Owner Account', icon: User },
  { id: 'security', name: 'Security PIN', icon: Shield },
  { id: 'finish', name: 'Complete', icon: Check }
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Company data
  const [companyName, setCompanyName] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [state, setState] = useState('27'); // Maharashtra default
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');

  // Owner data
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [password, setPassword] = useState('');

  // Security
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const handleComplete = async () => {
    if (pin !== confirmPin) {
      toast.error('PINs do not match');
      return;
    }

    setIsLoading(true);

    try {
      const companyId = generateId();
      const userId = generateId();
      const now = new Date();

      // Create company
      await db.companies.add({
        id: companyId,
        name: companyName,
        gstin,
        pan,
        address: {
          line1: address,
          city: '',
          state: 'Maharashtra',
          stateCode: state,
          pincode: '',
          country: 'India'
        },
        email: companyEmail,
        phone,
        bankDetails: {
          bankName: '',
          accountName: companyName,
          accountNumber: '',
          ifscCode: ''
        },
        signatory: ownerName,
        createdAt: now,
        updatedAt: now,
        _syncStatus: 'PENDING',
        _localVersion: 1,
        _lastModified: now
      });

      // Create owner user
      await db.users.add({
        id: userId,
        companyId,
        email: ownerEmail.toLowerCase(),
        name: ownerName,
        phone,
        role: UserRole.OWNER,
        permissions: defaultPermissions[UserRole.OWNER],
        pin: await hashPin(pin),
        isActive: true,
        createdAt: now,
        updatedAt: now,
        _syncStatus: 'PENDING',
        _localVersion: 1,
        _lastModified: now
      });

      // Set session
      localStorage.setItem('currentUserId', userId);
      localStorage.setItem('currentCompanyId', companyId);

      toast.success('Setup complete! Welcome to TourCompliance Pro');

      // Navigate to dashboard
      setTimeout(() => {
        window.location.href = '/';
      }, 500);

    } catch (error) {
      console.error('Setup failed:', error);
      toast.error('Setup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        return companyName && gstin && pan;
      case 1:
        return ownerName && ownerEmail && password.length >= 6;
      case 2:
        return pin.length === 4 && confirmPin.length === 4;
      default:
        return true;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <span className="text-2xl font-bold text-white font-display">TC</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-slate-800 dark:text-white">
            Welcome to TourCompliance Pro
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Let's set up your account in just a few steps
          </p>
        </div>

        {/* Stepper */}
        <div className="card mb-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = index < currentStep;
              const isCurrent = index === currentStep;

              return (
                <div key={step.id} className="flex items-center">
                  <div className={clsx(
                    'flex items-center gap-2',
                    isCompleted && 'text-success-600',
                    isCurrent && 'text-primary-600',
                    !isCompleted && !isCurrent && 'text-slate-400'
                  )}>
                    <div className={clsx(
                      'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium',
                      isCompleted && 'bg-success-100 dark:bg-success-500/30',
                      isCurrent && 'bg-primary-100 dark:bg-primary-500/30',
                      !isCompleted && !isCurrent && 'bg-slate-100 dark:bg-slate-700'
                    )}>
                      {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>
                    <span className="hidden sm:inline text-sm font-medium">{step.name}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={clsx(
                      'w-8 sm:w-16 h-0.5 mx-2',
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
              <div>
                <h2 className="text-xl font-display font-semibold text-slate-800 dark:text-white">
                  Company Details
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                  Enter your tour company's registration details
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="label">Company Name *</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="input"
                    placeholder="Your Tour Company Pvt Ltd"
                    required
                  />
                </div>
                <div>
                  <label className="label">GSTIN *</label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    className="input font-mono"
                    placeholder="27AAPFU0939F1Z5"
                    maxLength={15}
                    required
                  />
                </div>
                <div>
                  <label className="label">PAN *</label>
                  <input
                    type="text"
                    value={pan}
                    onChange={(e) => setPan(e.target.value.toUpperCase())}
                    className="input font-mono"
                    placeholder="AAPFU0939F"
                    maxLength={10}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Address</label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="input"
                    rows={2}
                    placeholder="Complete business address"
                  />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="input"
                    placeholder="+91 9876543210"
                  />
                </div>
                <div>
                  <label className="label">Company Email</label>
                  <input
                    type="email"
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    className="input"
                    placeholder="contact@company.com"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-display font-semibold text-slate-800 dark:text-white">
                  Owner Account
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                  Create the primary admin account with full access
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="label">Your Name *</label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="input"
                    placeholder="Your full name"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Email *</label>
                  <input
                    type="email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    className="input"
                    placeholder="you@email.com"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Password * (min 6 characters)</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input"
                    placeholder="••••••••"
                    minLength={6}
                    required
                  />
                </div>
              </div>

              <div className="bg-primary-50 dark:bg-primary-500/10 p-4 rounded-lg">
                <p className="text-sm text-primary-700 dark:text-primary-300">
                  <strong>Note:</strong> As the owner, you'll have full access to all features
                  including profit dashboard, user management, and settings.
                </p>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-display font-semibold text-slate-800 dark:text-white">
                  Security PIN
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                  Set a 4-digit PIN to access sensitive information like profits
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">4-Digit PIN *</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="input text-center text-2xl tracking-widest font-mono"
                    placeholder="••••"
                    maxLength={4}
                    required
                  />
                </div>
                <div>
                  <label className="label">Confirm PIN *</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className={clsx(
                      'input text-center text-2xl tracking-widest font-mono',
                      confirmPin && pin !== confirmPin && 'input-error'
                    )}
                    placeholder="••••"
                    maxLength={4}
                    required
                  />
                </div>
              </div>

              {confirmPin && pin !== confirmPin && (
                <p className="text-sm text-danger-600">PINs do not match</p>
              )}

              <div className="bg-warning-50 dark:bg-warning-500/10 p-4 rounded-lg">
                <p className="text-sm text-warning-700 dark:text-warning-300">
                  <strong>Remember this PIN!</strong> It protects your profit dashboard
                  and sensitive business data. You can change it later in settings.
                </p>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6 text-center py-8">
              <div className="w-20 h-20 mx-auto bg-success-100 dark:bg-success-500/20 rounded-full flex items-center justify-center">
                <Check className="w-10 h-10 text-success-600 dark:text-success-400" />
              </div>
              <div>
                <h2 className="text-xl font-display font-semibold text-slate-800 dark:text-white">
                  All Set!
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto">
                  Your TourCompliance Pro account is ready. Click complete to start
                  managing your bookings with automatic tax compliance.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg text-left max-w-sm mx-auto">
                <p className="text-sm font-medium text-slate-800 dark:text-white mb-2">
                  Quick recap:
                </p>
                <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                  <li>✓ Company: {companyName}</li>
                  <li>✓ GSTIN: {gstin}</li>
                  <li>✓ Owner: {ownerName}</li>
                  <li>✓ Security PIN: ••••</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
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
              disabled={!isStepValid()}
              className="btn btn-primary disabled:opacity-50"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={isLoading}
              className="btn btn-success"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Complete Setup
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
