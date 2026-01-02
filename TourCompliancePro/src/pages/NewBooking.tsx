import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Users, MapPin, CreditCard, FileText, Check, AlertTriangle, Plus, Trash2, Calculator } from 'lucide-react';
import { clsx } from 'clsx';
import { toast } from 'sonner';

// Import tax calculators
import { calculateTCS, type TCSCalculationInput } from '@/lib/tax/tcs-calculator';
import { TCSExemptionReason, GSTType, SupplyType, PaymentStatus } from '@/types';
import { db, generateId } from '@/lib/db/database';
import { useAuth } from '@/hooks/useAuth';

// GST Configuration
const GST_RATE = 0.18; // 18%

// Helper function to calculate GST inline
function calculateSimpleGST(
  taxableAmount: number,
  sellerGstin: string,
  buyerGstin: string
): {
  type: GSTType;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalGst: number;
} {
  // Determine if interstate based on first 2 digits of GSTIN
  const sellerState = sellerGstin ? sellerGstin.substring(0, 2) : '27';
  const buyerState = buyerGstin ? buyerGstin.substring(0, 2) : sellerState;
  const isInterstate = sellerState !== buyerState && buyerGstin;

  const gstAmount = Math.round(taxableAmount * GST_RATE * 100) / 100;

  if (isInterstate) {
    return {
      type: GSTType.IGST,
      taxableValue: taxableAmount,
      cgst: 0,
      sgst: 0,
      igst: gstAmount,
      totalGst: gstAmount
    };
  } else {
    const halfGst = Math.round((gstAmount / 2) * 100) / 100;
    return {
      type: GSTType.CGST_SGST,
      taxableValue: taxableAmount,
      cgst: halfGst,
      sgst: halfGst,
      igst: 0,
      totalGst: halfGst * 2
    };
  }
}

// Helper function to validate cash limit (Section 269ST)
function validateCashLimit(
  cashAmount: number,
  adultCount: number,
  minorCount: number
): {
  isValid: boolean;
  maxAllowed: number;
  violationAmount: number;
  penaltyAmount: number;
  message: string;
} {
  // Section 269ST: Max ₹2L cash per adult, minors cannot pay cash
  const maxAllowed = adultCount * 200000;
  const isValid = cashAmount <= maxAllowed;
  const violationAmount = isValid ? 0 : cashAmount - maxAllowed;
  const penaltyAmount = violationAmount; // 100% penalty under Section 271DA

  let message = '';
  if (!isValid) {
    message = `Cash exceeds Section 269ST limit of ₹${(maxAllowed / 100000).toFixed(1)}L. Reduce by ₹${violationAmount.toLocaleString('en-IN')}.`;
  } else if (minorCount > 0 && cashAmount > 0) {
    message = `Note: ${minorCount} minor(s) cannot receive cash. Only ${adultCount} adults can.`;
  }

  return { isValid, maxAllowed, violationAmount, penaltyAmount, message };
}

// Helper to get state name from GSTIN
const STATE_CODES: Record<string, string> = {
  '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab',
  '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana',
  '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
  '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh',
  '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram',
  '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam',
  '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha',
  '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
  '26': 'Dadra & Nagar Haveli', '27': 'Maharashtra', '29': 'Karnataka',
  '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala',
  '33': 'Tamil Nadu', '34': 'Puducherry', '35': 'Andaman & Nicobar',
  '36': 'Telangana', '37': 'Andhra Pradesh'
};

function getStateFromGstin(gstin: string): string {
  if (!gstin || gstin.length < 2) return 'Maharashtra';
  return STATE_CODES[gstin.substring(0, 2)] || 'Maharashtra';
}

const steps = [
  { id: 'client', name: 'Client', icon: Users },
  { id: 'trip', name: 'Trip Details', icon: MapPin },
  { id: 'pricing', name: 'Pricing', icon: CreditCard },
  { id: 'review', name: 'Review', icon: FileText }
];

interface Traveler {
  id: string;
  name: string;
  dateOfBirth: string;
  passportNo: string;
  isAdult: boolean;
}

interface PriceComponent {
  id: string;
  name: string;
  costPrice: number;
  markupPercent: number;
  sellingPrice: number;
  isPureAgent: boolean;
}

// Helper to format Indian currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

// Calculate age from date of birth
function calculateAge(dob: string): number {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export default function NewBooking() {
  const navigate = useNavigate();
  const { company } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Client details
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientGstin, setClientGstin] = useState('');
  const [clientPan, setClientPan] = useState('');
  const [clientType, setClientType] = useState<'INDIVIDUAL' | 'BUSINESS' | 'GOVERNMENT'>('INDIVIDUAL');

  // Trip details
  const [destination, setDestination] = useState('');
  const [tripType, setTripType] = useState<'INTERNATIONAL' | 'DOMESTIC'>('INTERNATIONAL');
  const [supplyType, setSupplyType] = useState<SupplyType>(SupplyType.DIRECT);
  const [departureDate, setDepartureDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [travelers, setTravelers] = useState<Traveler[]>([
    { id: generateId(), name: '', dateOfBirth: '', passportNo: '', isAdult: true }
  ]);

  // Pricing
  const [components, setComponents] = useState<PriceComponent[]>([
    { id: generateId(), name: '', costPrice: 0, markupPercent: 10, sellingPrice: 0, isPureAgent: false }
  ]);

  // Payment
  const [cashAmount, setCashAmount] = useState(0);
  const [previousCumulative, setPreviousCumulative] = useState(0); // For TCS slab calculation

  // Update traveler adult status when DOB changes
  useEffect(() => {
    setTravelers(prev => prev.map(t => ({
      ...t,
      isAdult: t.dateOfBirth ? calculateAge(t.dateOfBirth) >= 18 : true
    })));
  }, [travelers.map(t => t.dateOfBirth).join(',')]);

  // Calculate component selling prices
  useEffect(() => {
    setComponents(prev => prev.map(c => ({
      ...c,
      sellingPrice: c.costPrice * (1 + c.markupPercent / 100)
    })));
  }, [components.map(c => `${c.costPrice}-${c.markupPercent}`).join(',')]);

  // Count adults and minors
  const adultCount = travelers.filter(t => t.isAdult).length;
  const minorCount = travelers.filter(t => !t.isAdult).length;

  // Calculate totals
  const calculations = useMemo(() => {
    // Subtotal (sum of all selling prices)
    const subtotal = components.reduce((sum, c) => sum + c.sellingPrice, 0);

    // Pure agent amount (no GST on this)
    const pureAgentAmount = components
      .filter(c => c.isPureAgent)
      .reduce((sum, c) => sum + c.costPrice, 0);

    // Service fee (markup on pure agent + full amount on direct)
    const serviceFeeTotal = components.reduce((sum, c) => {
      if (c.isPureAgent) {
        return sum + (c.sellingPrice - c.costPrice); // Only markup
      }
      return sum + c.sellingPrice; // Full amount
    }, 0);

    // GST Calculation - use the inline helper
    let taxableForGst: number;
    if (supplyType === SupplyType.PURE_AGENT) {
      // GST only on service fee (the markup), not on pure agent costs
      taxableForGst = serviceFeeTotal - pureAgentAmount;
      if (taxableForGst < 0) taxableForGst = 0;
    } else {
      // GST on full amount (Direct supply)
      taxableForGst = subtotal;
    }

    const gstResult = calculateSimpleGST(
      taxableForGst,
      company?.gstin || '',
      clientGstin
    );

    const gstAmount = gstResult.totalGst;
    const subtotalWithGst = subtotal + gstAmount;

    // TCS Calculation
    const tcsInput: TCSCalculationInput = {
      packageValue: subtotalWithGst,
      previousCumulative: previousCumulative,
      isInternational: tripType === 'INTERNATIONAL',
      hasPan: !!clientPan,
      exemptionReason: supplyType === SupplyType.PURE_AGENT
        ? TCSExemptionReason.PURE_AGENT
        : (clientType === 'GOVERNMENT' ? TCSExemptionReason.GOVERNMENT_ENTITY : TCSExemptionReason.NONE)
    };
    const tcsResult = calculateTCS(tcsInput);

    // Grand total
    const grandTotal = subtotalWithGst + tcsResult.totalTcs;

    // Cash validation - use the inline helper
    const cashValidation = validateCashLimit(cashAmount, adultCount, minorCount);

    // Max cash allowed
    const maxCash = adultCount * 200000;

    return {
      subtotal,
      pureAgentAmount,
      serviceFee: serviceFeeTotal,
      gstResult,
      gstAmount,
      subtotalWithGst,
      tcsResult,
      grandTotal,
      cashValidation,
      maxCash,
      adultCount,
      minorCount
    };
  }, [components, supplyType, tripType, clientPan, clientGstin, clientType, company, previousCumulative, cashAmount, adultCount, minorCount]);

  // Add traveler
  const addTraveler = () => {
    setTravelers(prev => [...prev, {
      id: generateId(),
      name: '',
      dateOfBirth: '',
      passportNo: '',
      isAdult: true
    }]);
  };

  // Remove traveler
  const removeTraveler = (id: string) => {
    if (travelers.length > 1) {
      setTravelers(prev => prev.filter(t => t.id !== id));
    }
  };

  // Update traveler
  const updateTraveler = (id: string, field: keyof Traveler, value: string) => {
    setTravelers(prev => prev.map(t =>
      t.id === id ? { ...t, [field]: value } : t
    ));
  };

  // Add component
  const addComponent = () => {
    setComponents(prev => [...prev, {
      id: generateId(),
      name: '',
      costPrice: 0,
      markupPercent: 10,
      sellingPrice: 0,
      isPureAgent: false
    }]);
  };

  // Remove component
  const removeComponent = (id: string) => {
    if (components.length > 1) {
      setComponents(prev => prev.filter(c => c.id !== id));
    }
  };

  // Update component
  const updateComponent = (id: string, field: keyof PriceComponent, value: string | number | boolean) => {
    setComponents(prev => prev.map(c =>
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  // Validate current step
  const isStepValid = () => {
    switch (currentStep) {
      case 0: // Client
        return clientName && clientPhone;
      case 1: // Trip
        return destination && departureDate && travelers.every(t => t.name && t.dateOfBirth);
      case 2: // Pricing
        return components.every(c => c.name && c.costPrice > 0);
      case 3: // Review
        return true;
      default:
        return true;
    }
  };

  // Submit booking
  const handleSubmit = async () => {
    if (!company) {
      toast.error('Company not found');
      return;
    }

    setIsSubmitting(true);

    try {
      const bookingId = generateId();
      const clientId = generateId();
      const now = new Date();

      // Create client first
      await db.clients.add({
        id: clientId,
        companyId: company.id,
        name: clientName,
        phone: clientPhone,
        email: clientEmail || undefined,
        gstin: clientGstin || undefined,
        pan: clientPan || undefined,
        type: clientType,
        isRegistered: !!clientGstin,
        address: {
          line1: '',
          city: '',
          state: clientGstin ? getStateFromGstin(clientGstin) : 'Maharashtra',
          stateCode: clientGstin ? clientGstin.substring(0, 2) : '27',
          pincode: '',
          country: 'India'
        },
        createdAt: now,
        updatedAt: now,
        _syncStatus: 'PENDING',
        _localVersion: 1,
        _lastModified: now
      });

      // Create booking
      await db.bookings.add({
        id: bookingId,
        companyId: company.id,
        clientId,
        bookingNumber: `BK-${Date.now().toString(36).toUpperCase()}`,
        status: 'CONFIRMED',
        destination,
        supplyType,
        tripType: tripType === 'INTERNATIONAL' ? 'INTERNATIONAL' : 'DOMESTIC',
        departureDate: new Date(departureDate),
        returnDate: returnDate ? new Date(returnDate) : new Date(departureDate),
        adultCount,
        childCount: minorCount,
        infantCount: 0,
        travelers: travelers.map(t => ({
          id: generateId(),
          name: t.name,
          dateOfBirth: new Date(t.dateOfBirth),
          age: calculateAge(t.dateOfBirth),
          isAdult: t.isAdult,
          passportNumber: t.passportNo || undefined,
          nationality: 'Indian'
        })),
        lineItems: components.map(c => ({
          id: generateId(),
          description: c.name,
          sacCode: '998555', // Tour operator services
          quantity: 1,
          unitPrice: c.sellingPrice,
          amount: c.sellingPrice,
          isPureAgent: c.isPureAgent,
          serviceFee: c.isPureAgent ? (c.sellingPrice - c.costPrice) : c.sellingPrice,
          serviceFeeGst: 0,
          gstRate: GST_RATE,
          gstAmount: 0,
          displayName: c.name
        })),
        payments: [],
        createdBy: 'system',
        subtotal: calculations.subtotal,
        gstDetails: {
          type: calculations.gstResult.type,
          taxableValue: calculations.gstResult.taxableValue,
          cgstRate: 0.09,
          cgstAmount: calculations.gstResult.cgst,
          sgstRate: 0.09,
          sgstAmount: calculations.gstResult.sgst,
          igstRate: 0.18,
          igstAmount: calculations.gstResult.igst,
          totalGst: calculations.gstAmount,
          breakdownByRate: [{
            rate: 0.18,
            taxableValue: calculations.gstResult.taxableValue,
            cgst: calculations.gstResult.cgst,
            sgst: calculations.gstResult.sgst,
            igst: calculations.gstResult.igst,
            total: calculations.gstAmount
          }]
        },
        tcsDetails: {
          applicable: calculations.tcsResult.applicable,
          exemptionReason: calculations.tcsResult.exemptionReason,
          previousCumulative: calculations.tcsResult.previousCumulative,
          currentBookingValue: calculations.tcsResult.currentBookingValue,
          newCumulative: calculations.tcsResult.newCumulative,
          thresholdApplied: calculations.tcsResult.thresholdApplied,
          amountAt5Percent: calculations.tcsResult.amountAt5Percent,
          tcsAt5Percent: calculations.tcsResult.tcsAt5Percent,
          amountAt20Percent: calculations.tcsResult.amountAt20Percent,
          tcsAt20Percent: calculations.tcsResult.tcsAt20Percent,
          totalTcs: calculations.tcsResult.totalTcs,
          effectiveRate: calculations.tcsResult.effectiveRate
        },
        cashLimitDetails: {
          maxCashAllowed: calculations.maxCash,
          adultCount: calculations.adultCount,
          minorCount: calculations.minorCount,
          cashReceived: cashAmount,
          isCompliant: calculations.cashValidation.isValid,
          violationAmount: calculations.cashValidation.violationAmount,
          penaltyAmount: calculations.cashValidation.penaltyAmount,
          warningMessage: calculations.cashValidation.message || undefined
        },
        grandTotal: calculations.grandTotal,
        cashReceived: cashAmount,
        paymentStatus: PaymentStatus.PENDING,
        createdAt: now,
        updatedAt: now,
        _syncStatus: 'PENDING',
        _localVersion: 1,
        _lastModified: now
      });

      toast.success('Booking created successfully!');
      navigate('/bookings');
    } catch (error) {
      console.error('Failed to create booking:', error);
      toast.error('Failed to create booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
                    {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
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
        {/* Step 0: Client Details */}
        {currentStep === 0 && (
          <div className="space-y-6">
            <h2 className="text-lg font-display font-semibold text-slate-800 dark:text-white">
              Client Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Client Name *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Enter client name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Phone Number *</label>
                <input
                  type="tel"
                  className="input"
                  placeholder="+91 9876543210"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input"
                  placeholder="client@email.com"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Client Type</label>
                <select
                  className="input"
                  value={clientType}
                  onChange={(e) => setClientType(e.target.value as typeof clientType)}
                >
                  <option value="INDIVIDUAL">Individual</option>
                  <option value="BUSINESS">Business</option>
                  <option value="GOVERNMENT">Government (TCS Exempt)</option>
                </select>
              </div>
              <div>
                <label className="label">PAN {tripType === 'INTERNATIONAL' && '(Required for lower TCS)'}</label>
                <input
                  type="text"
                  className="input font-mono uppercase"
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  value={clientPan}
                  onChange={(e) => setClientPan(e.target.value.toUpperCase())}
                />
                {tripType === 'INTERNATIONAL' && !clientPan && (
                  <p className="text-xs text-warning-600 mt-1">Without PAN, TCS rate doubles (10% instead of 5%)</p>
                )}
              </div>
              <div>
                <label className="label">GSTIN (if registered)</label>
                <input
                  type="text"
                  className="input font-mono uppercase"
                  placeholder="27AAPFU0939F1Z5"
                  maxLength={15}
                  value={clientGstin}
                  onChange={(e) => setClientGstin(e.target.value.toUpperCase())}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Trip Details */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <h2 className="text-lg font-display font-semibold text-slate-800 dark:text-white">
              Trip Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label">Destination *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., Dubai, Singapore, Europe"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Trip Type *</label>
                <select
                  className="input"
                  value={tripType}
                  onChange={(e) => setTripType(e.target.value as typeof tripType)}
                >
                  <option value="INTERNATIONAL">International (TCS Applicable)</option>
                  <option value="DOMESTIC">Domestic (No TCS)</option>
                </select>
              </div>
              <div>
                <label className="label">Supply Type *</label>
                <select
                  className="input"
                  value={supplyType}
                  onChange={(e) => setSupplyType(e.target.value as SupplyType)}
                >
                  <option value={SupplyType.DIRECT}>Direct Supply (Full GST)</option>
                  <option value={SupplyType.PURE_AGENT}>Pure Agent (GST on Service Fee only)</option>
                </select>
              </div>
              <div>
                <label className="label">Departure Date *</label>
                <input
                  type="date"
                  className="input"
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Return Date</label>
                <input
                  type="date"
                  className="input"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                />
              </div>
            </div>

            {/* Travelers */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-md font-medium text-slate-800 dark:text-white">
                  Travelers ({travelers.length})
                </h3>
                <div className="text-sm text-slate-500">
                  Adults: {adultCount} | Minors: {minorCount}
                </div>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Cash limit: {formatCurrency(adultCount * 200000)} (₹2L per adult). Minors cannot pay cash.
              </p>

              <div className="space-y-4">
                {travelers.map((traveler, index) => (
                  <div key={traveler.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <div>
                      <label className="label">Name *</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="Traveler name"
                        value={traveler.name}
                        onChange={(e) => updateTraveler(traveler.id, 'name', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="label">Date of Birth *</label>
                      <input
                        type="date"
                        className="input"
                        value={traveler.dateOfBirth}
                        onChange={(e) => updateTraveler(traveler.id, 'dateOfBirth', e.target.value)}
                      />
                      {traveler.dateOfBirth && (
                        <p className={clsx(
                          'text-xs mt-1',
                          traveler.isAdult ? 'text-success-600' : 'text-warning-600'
                        )}>
                          {traveler.isAdult ? '✓ Adult (18+)' : '⚠ Minor (under 18)'}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="label">Passport No.</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="A1234567"
                        value={traveler.passportNo}
                        onChange={(e) => updateTraveler(traveler.id, 'passportNo', e.target.value)}
                      />
                    </div>
                    <div className="flex items-end">
                      {travelers.length > 1 && (
                        <button
                          onClick={() => removeTraveler(traveler.id)}
                          className="btn btn-secondary text-danger-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={addTraveler} className="btn btn-secondary mt-4">
                <Plus className="w-4 h-4" />
                Add Traveler
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Pricing */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <h2 className="text-lg font-display font-semibold text-slate-800 dark:text-white">
              Pricing & Components
            </h2>

            <div className="bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/30 rounded-lg p-4">
              <p className="text-sm text-primary-700 dark:text-primary-300">
                <Calculator className="w-4 h-4 inline mr-1" />
                <strong>Live Calculation:</strong> GST, TCS, and cash limits update automatically as you enter values.
              </p>
            </div>

            {/* Price Components */}
            <div className="space-y-4">
              {components.map((component, index) => (
                <div key={component.id} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <div>
                    <label className="label">Component *</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g., Flight, Hotel"
                      value={component.name}
                      onChange={(e) => updateComponent(component.id, 'name', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Cost Price (₹) *</label>
                    <input
                      type="number"
                      className="input"
                      placeholder="0"
                      value={component.costPrice || ''}
                      onChange={(e) => updateComponent(component.id, 'costPrice', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="label">Markup %</label>
                    <input
                      type="number"
                      className="input"
                      placeholder="10"
                      value={component.markupPercent}
                      onChange={(e) => updateComponent(component.id, 'markupPercent', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="label">Selling Price</label>
                    <input
                      type="text"
                      className="input bg-slate-50 dark:bg-slate-800"
                      value={formatCurrency(component.sellingPrice)}
                      readOnly
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={component.isPureAgent}
                        onChange={(e) => updateComponent(component.id, 'isPureAgent', e.target.checked)}
                        className="rounded"
                      />
                      Pure Agent
                    </label>
                    {components.length > 1 && (
                      <button
                        onClick={() => removeComponent(component.id)}
                        className="btn btn-secondary text-danger-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button onClick={addComponent} className="btn btn-secondary">
              <Plus className="w-4 h-4" />
              Add Component
            </button>

            {/* Tax Summary */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
              <h3 className="text-md font-medium text-slate-800 dark:text-white mb-4">
                Tax Calculation Summary
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Subtotal</p>
                  <p className="text-xl font-display font-bold text-slate-800 dark:text-white">
                    {formatCurrency(calculations.subtotal)}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    GST ({calculations.gstResult.type === GSTType.IGST ? 'IGST 18%' : 'CGST+SGST 18%'})
                  </p>
                  <p className="text-xl font-display font-bold text-slate-800 dark:text-white">
                    {formatCurrency(calculations.gstAmount)}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    TCS {calculations.tcsResult.applicable ? `(${(calculations.tcsResult.effectiveRate * 100).toFixed(1)}%)` : '(Exempt)'}
                  </p>
                  <p className="text-xl font-display font-bold text-slate-800 dark:text-white">
                    {formatCurrency(calculations.tcsResult.totalTcs)}
                  </p>
                </div>
                <div className="p-4 bg-primary-50 dark:bg-primary-500/20 rounded-lg">
                  <p className="text-xs text-primary-600 dark:text-primary-400">Grand Total</p>
                  <p className="text-xl font-display font-bold text-primary-700 dark:text-primary-300">
                    {formatCurrency(calculations.grandTotal)}
                  </p>
                </div>
              </div>

              {/* TCS Breakdown */}
              {calculations.tcsResult.applicable && calculations.tcsResult.breakdown.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg p-4 mb-4">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-2">
                    TCS Breakdown (Section 206C(1G))
                  </p>
                  {calculations.tcsResult.breakdown.map((slab, i) => (
                    <p key={i} className="text-sm text-amber-700 dark:text-amber-400">
                      {slab.slabDescription}: {formatCurrency(slab.amount)} × {(slab.rate * 100)}% = {formatCurrency(slab.tcs)}
                    </p>
                  ))}
                  {calculations.tcsResult.warnings.map((warning, i) => (
                    <p key={i} className="text-xs text-amber-600 dark:text-amber-500 mt-2">
                      ⚠ {warning}
                    </p>
                  ))}
                </div>
              )}

              {/* Cash Payment */}
              <div className="mt-6">
                <label className="label">Cash Payment Amount (Optional)</label>
                <input
                  type="number"
                  className={clsx(
                    'input max-w-xs',
                    !calculations.cashValidation.isValid && 'border-danger-500'
                  )}
                  placeholder="0"
                  value={cashAmount || ''}
                  onChange={(e) => setCashAmount(parseFloat(e.target.value) || 0)}
                />
                <p className="text-sm text-slate-500 mt-1">
                  Max cash allowed: {formatCurrency(calculations.maxCash)} ({adultCount} adults × ₹2L)
                </p>

                {!calculations.cashValidation.isValid && (
                  <div className="mt-2 p-3 bg-danger-50 dark:bg-danger-500/10 border border-danger-200 dark:border-danger-500/30 rounded-lg">
                    <p className="text-sm text-danger-700 dark:text-danger-300 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      {calculations.cashValidation.message}
                    </p>
                    <p className="text-xs text-danger-600 mt-1">
                      Violation: {formatCurrency(calculations.cashValidation.violationAmount)} |
                      Potential Penalty: {formatCurrency(calculations.cashValidation.penaltyAmount)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h2 className="text-lg font-display font-semibold text-slate-800 dark:text-white">
              Review Booking
            </h2>

            {calculations.cashValidation.isValid ? (
              <div className="bg-success-50 dark:bg-success-500/10 border border-success-200 dark:border-success-500/30 rounded-lg p-4">
                <p className="text-sm text-success-700 dark:text-success-300">
                  <Check className="w-4 h-4 inline mr-1" />
                  <strong>All calculations verified!</strong> TCS, GST, and cash limits are compliant.
                </p>
              </div>
            ) : (
              <div className="bg-danger-50 dark:bg-danger-500/10 border border-danger-200 dark:border-danger-500/30 rounded-lg p-4">
                <p className="text-sm text-danger-700 dark:text-danger-300">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  <strong>Warning:</strong> Cash payment exceeds Section 269ST limit. Reduce cash or add more adult travelers.
                </p>
              </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Client Info */}
              <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                <h3 className="font-medium text-slate-800 dark:text-white mb-3">Client</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="text-slate-500">Name:</span> {clientName}</p>
                  <p><span className="text-slate-500">Phone:</span> {clientPhone}</p>
                  <p><span className="text-slate-500">PAN:</span> {clientPan || 'Not provided'}</p>
                  <p><span className="text-slate-500">Type:</span> {clientType}</p>
                </div>
              </div>

              {/* Trip Info */}
              <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                <h3 className="font-medium text-slate-800 dark:text-white mb-3">Trip</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="text-slate-500">Destination:</span> {destination}</p>
                  <p><span className="text-slate-500">Type:</span> {tripType}</p>
                  <p><span className="text-slate-500">Travelers:</span> {adultCount} adults, {minorCount} minors</p>
                  <p><span className="text-slate-500">Dates:</span> {departureDate} to {returnDate || 'TBD'}</p>
                </div>
              </div>
            </div>

            {/* Final Pricing */}
            <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
              <h3 className="font-medium text-slate-800 dark:text-white mb-3">Final Pricing</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal ({components.length} components)</span>
                  <span>{formatCurrency(calculations.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">GST (18%)</span>
                  <span>{formatCurrency(calculations.gstAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">TCS ({(calculations.tcsResult.effectiveRate * 100).toFixed(1)}%)</span>
                  <span>{formatCurrency(calculations.tcsResult.totalTcs)}</span>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-700 pt-2 mt-2">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Grand Total</span>
                    <span className="text-primary-600 dark:text-primary-400">
                      {formatCurrency(calculations.grandTotal)}
                    </span>
                  </div>
                </div>
                {cashAmount > 0 && (
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>Cash Payment</span>
                    <span>{formatCurrency(cashAmount)}</span>
                  </div>
                )}
              </div>
            </div>
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
            disabled={!isStepValid()}
            className="btn btn-primary disabled:opacity-50"
          >
            Next
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !calculations.cashValidation.isValid}
            className="btn btn-success disabled:opacity-50"
          >
            {isSubmitting ? (
              <>Creating...</>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Create Booking
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
