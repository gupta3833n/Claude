/**
 * TourCompliance Pro - Tax Laws Configuration
 * =============================================
 *
 * CRITICAL: This file contains all tax rules and CANNOT be edited by users.
 * Only the software seller (you) can update this through app updates.
 *
 * All tax calculations MUST use these values - no hardcoding elsewhere.
 *
 * Last Updated: 2025-01-02
 * Effective From: FY 2024-25 onwards
 */

// ============================================================================
// FINANCIAL YEAR HELPERS
// ============================================================================

export interface FinancialYear {
  code: string;        // e.g., "2024-25"
  startDate: Date;
  endDate: Date;
}

export function getCurrentFinancialYear(): FinancialYear {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-indexed

  // FY starts April 1st
  if (month >= 3) { // April onwards
    return {
      code: `${year}-${(year + 1).toString().slice(-2)}`,
      startDate: new Date(year, 3, 1),      // April 1
      endDate: new Date(year + 1, 2, 31)    // March 31 next year
    };
  } else {
    return {
      code: `${year - 1}-${year.toString().slice(-2)}`,
      startDate: new Date(year - 1, 3, 1),  // April 1 previous year
      endDate: new Date(year, 2, 31)        // March 31 this year
    };
  }
}

export function getFinancialYearForDate(date: Date): FinancialYear {
  const year = date.getFullYear();
  const month = date.getMonth();

  if (month >= 3) {
    return {
      code: `${year}-${(year + 1).toString().slice(-2)}`,
      startDate: new Date(year, 3, 1),
      endDate: new Date(year + 1, 2, 31)
    };
  } else {
    return {
      code: `${year - 1}-${year.toString().slice(-2)}`,
      startDate: new Date(year - 1, 3, 1),
      endDate: new Date(year, 2, 31)
    };
  }
}

// ============================================================================
// TCS CONFIGURATION - Section 206C(1G)
// ============================================================================

export interface TCSConfig {
  /** FY for which this config applies */
  financialYear: string;

  /** Threshold amount (per PAN per FY) */
  threshold: number;

  /** Rate for amount up to threshold */
  rate1: number;

  /** Rate for amount above threshold */
  rate2: number;

  /** Rate if PAN not provided (higher of 2x rate or 5%) */
  rateWithoutPan: number;

  /** Effective from date */
  effectiveFrom: Date;

  /** Reference to section */
  section: string;

  /** Legal reference notes */
  notes: string;
}

/**
 * TCS configurations by financial year
 *
 * IMPORTANT: The threshold changed from ₹7L to ₹10L from FY 2025-26
 * (Budget 2025 amendment)
 */
export const TCS_CONFIG: Record<string, TCSConfig> = {
  '2023-24': {
    financialYear: '2023-24',
    threshold: 700000,          // ₹7,00,000
    rate1: 0.05,                // 5%
    rate2: 0.20,                // 20%
    rateWithoutPan: 0.10,       // 10% (higher of 2×5% or 5%)
    effectiveFrom: new Date(2023, 3, 1),
    section: '206C(1G)',
    notes: 'TCS on overseas tour package. Threshold ₹7L per PAN per FY.'
  },
  '2024-25': {
    financialYear: '2024-25',
    threshold: 700000,          // ₹7,00,000
    rate1: 0.05,                // 5%
    rate2: 0.20,                // 20%
    rateWithoutPan: 0.10,       // 10%
    effectiveFrom: new Date(2024, 3, 1),
    section: '206C(1G)',
    notes: 'TCS on overseas tour package. Threshold ₹7L per PAN per FY.'
  },
  '2025-26': {
    financialYear: '2025-26',
    threshold: 1000000,         // ₹10,00,000 (increased by Budget 2025)
    rate1: 0.05,                // 5%
    rate2: 0.20,                // 20%
    rateWithoutPan: 0.10,       // 10%
    effectiveFrom: new Date(2025, 3, 1),
    section: '206C(1G)',
    notes: 'TCS threshold increased to ₹10L from FY 2025-26 (Budget 2025).'
  },
  // Future years - use 2025-26 config as default
  'default': {
    financialYear: 'default',
    threshold: 1000000,
    rate1: 0.05,
    rate2: 0.20,
    rateWithoutPan: 0.10,
    effectiveFrom: new Date(2025, 3, 1),
    section: '206C(1G)',
    notes: 'Default config for future years. Update when budget announces changes.'
  }
};

export function getTCSConfig(financialYearCode?: string): TCSConfig {
  const fyCode = financialYearCode || getCurrentFinancialYear().code;
  return TCS_CONFIG[fyCode] || TCS_CONFIG['default'];
}

// ============================================================================
// GST CONFIGURATION
// ============================================================================

export interface GSTConfig {
  /** Standard GST rate for tour operators */
  standardRate: number;

  /** Rate without ITC (composition-like) */
  rateWithoutITC: number;

  /** Rate with ITC */
  rateWithITC: number;

  /** CGST component (half of CGST+SGST) */
  cgstRate: number;

  /** SGST component (half of CGST+SGST) */
  sgstRate: number;

  /** IGST rate (for interstate) */
  igstRate: number;

  /** Export rate (zero-rated) */
  exportRate: number;

  /** SEZ rate (zero-rated with refund) */
  sezRate: number;
}

export const GST_CONFIG: GSTConfig = {
  standardRate: 0.18,           // 18%
  rateWithoutITC: 0.05,         // 5% (no ITC available)
  rateWithITC: 0.18,            // 18% (with ITC)
  cgstRate: 0.09,               // 9%
  sgstRate: 0.09,               // 9%
  igstRate: 0.18,               // 18%
  exportRate: 0,                // 0% (zero-rated)
  sezRate: 0                    // 0% (zero-rated)
};

/**
 * SAC Codes for Tour Operators
 * SAC = Service Accounting Code
 */
export const SAC_CODES = {
  tourOperator: {
    code: '998551',
    description: 'Reservation services for transportation',
    rate: 0.18
  },
  accommodation: {
    code: '998552',
    description: 'Reservation services for accommodation, cruises and package tours',
    rate: 0.18
  },
  conventionCentre: {
    code: '998553',
    description: 'Reservation services for convention centres',
    rate: 0.18
  },
  tourOperatorServices: {
    code: '998555',
    description: 'Tour operator services',
    rate: 0.05  // 5% without ITC or 18% with ITC
  },
  touristGuide: {
    code: '998556',
    description: 'Tourist guide services',
    rate: 0.18
  },
  passengerTransport: {
    code: '996411',
    description: 'Local land transport services of passengers by railways',
    rate: 0.05
  },
  airTransport: {
    code: '996421',
    description: 'Scheduled air transport services of passengers',
    rate: 0.05  // Economy: 5%, Business: 12%
  }
} as const;

/**
 * State Codes for GST (used in GSTIN)
 * Format: First 2 digits of GSTIN
 */
export const STATE_CODES: Record<string, { code: string; name: string }> = {
  '01': { code: '01', name: 'Jammu & Kashmir' },
  '02': { code: '02', name: 'Himachal Pradesh' },
  '03': { code: '03', name: 'Punjab' },
  '04': { code: '04', name: 'Chandigarh' },
  '05': { code: '05', name: 'Uttarakhand' },
  '06': { code: '06', name: 'Haryana' },
  '07': { code: '07', name: 'Delhi' },
  '08': { code: '08', name: 'Rajasthan' },
  '09': { code: '09', name: 'Uttar Pradesh' },
  '10': { code: '10', name: 'Bihar' },
  '11': { code: '11', name: 'Sikkim' },
  '12': { code: '12', name: 'Arunachal Pradesh' },
  '13': { code: '13', name: 'Nagaland' },
  '14': { code: '14', name: 'Manipur' },
  '15': { code: '15', name: 'Mizoram' },
  '16': { code: '16', name: 'Tripura' },
  '17': { code: '17', name: 'Meghalaya' },
  '18': { code: '18', name: 'Assam' },
  '19': { code: '19', name: 'West Bengal' },
  '20': { code: '20', name: 'Jharkhand' },
  '21': { code: '21', name: 'Odisha' },
  '22': { code: '22', name: 'Chhattisgarh' },
  '23': { code: '23', name: 'Madhya Pradesh' },
  '24': { code: '24', name: 'Gujarat' },
  '25': { code: '25', name: 'Daman & Diu' },
  '26': { code: '26', name: 'Dadra & Nagar Haveli' },
  '27': { code: '27', name: 'Maharashtra' },
  '28': { code: '28', name: 'Andhra Pradesh (Old)' },
  '29': { code: '29', name: 'Karnataka' },
  '30': { code: '30', name: 'Goa' },
  '31': { code: '31', name: 'Lakshadweep' },
  '32': { code: '32', name: 'Kerala' },
  '33': { code: '33', name: 'Tamil Nadu' },
  '34': { code: '34', name: 'Puducherry' },
  '35': { code: '35', name: 'Andaman & Nicobar Islands' },
  '36': { code: '36', name: 'Telangana' },
  '37': { code: '37', name: 'Andhra Pradesh (New)' },
  '38': { code: '38', name: 'Ladakh' },
  '97': { code: '97', name: 'Other Territory' },
  '99': { code: '99', name: 'Centre Jurisdiction' }
};

export function getStateFromGSTIN(gstin: string): { code: string; name: string } | null {
  if (!gstin || gstin.length < 2) return null;
  const stateCode = gstin.substring(0, 2);
  return STATE_CODES[stateCode] || null;
}

export function isInterstate(sellerGstin: string, buyerGstin?: string, buyerStateCode?: string): boolean {
  const sellerState = getStateFromGSTIN(sellerGstin);
  if (!sellerState) return false;

  if (buyerGstin) {
    const buyerState = getStateFromGSTIN(buyerGstin);
    return buyerState?.code !== sellerState.code;
  }

  if (buyerStateCode) {
    return buyerStateCode !== sellerState.code;
  }

  return false;
}

// ============================================================================
// SECTION 269ST - CASH PAYMENT LIMITS
// ============================================================================

export interface CashLimitConfig {
  /** Maximum cash per person per day/transaction */
  limitPerPerson: number;

  /** Minimum age to pay cash (contract law - void ab initio for minors) */
  minimumAge: number;

  /** Penalty rate for violation (as multiplier, 1.0 = 100%) */
  penaltyRate: number;

  /** Section reference */
  section: string;

  /** Legal notes */
  notes: string;
}

export const CASH_LIMIT_CONFIG: CashLimitConfig = {
  limitPerPerson: 200000,       // ₹2,00,000
  minimumAge: 18,               // Only adults can pay cash
  penaltyRate: 1.0,             // 100% penalty on violation amount
  section: '269ST',
  notes: `No person shall receive cash of ₹2,00,000 or more:
    (a) in aggregate from a person in a day; or
    (b) in respect of a single transaction; or
    (c) in respect of transactions relating to one event or occasion.

    IMPORTANT: Minors (under 18) cannot enter into valid contracts (Indian Contract Act).
    Cash payments from minors are void ab initio. Only adult travelers can pay cash.`
};

/**
 * Calculate maximum cash allowed for a group of travelers
 *
 * @param adultCount - Number of travelers aged 18+
 * @param minorCount - Number of travelers under 18 (for warning)
 * @returns Object with max cash allowed and any warnings
 */
export function calculateMaxCashAllowed(
  adultCount: number,
  minorCount: number = 0
): {
  maxCash: number;
  adultCount: number;
  minorCount: number;
  warningMessage: string | null;
} {
  if (adultCount < 0 || minorCount < 0) {
    throw new Error('Traveler counts cannot be negative');
  }

  if (adultCount === 0 && minorCount > 0) {
    return {
      maxCash: 0,
      adultCount: 0,
      minorCount,
      warningMessage: 'No cash payment allowed. At least one adult (18+) must be present to make cash payments. Minors cannot enter into valid contracts under Indian Contract Act.'
    };
  }

  const maxCash = adultCount * CASH_LIMIT_CONFIG.limitPerPerson;

  let warningMessage: string | null = null;
  if (minorCount > 0) {
    warningMessage = `Cash limit calculated for ${adultCount} adult(s) only. ${minorCount} minor(s) cannot pay cash as per Indian Contract Act - contracts with minors are void ab initio.`;
  }

  return {
    maxCash,
    adultCount,
    minorCount,
    warningMessage
  };
}

// ============================================================================
// PURE AGENT RULES (Rule 33 of CGST Rules, 2017)
// ============================================================================

export interface PureAgentConfig {
  /** GST rate on service fee only */
  serviceFeeGstRate: number;

  /** Conditions for Pure Agent */
  conditions: string[];

  /** Required documentation */
  requiredDocuments: string[];

  /** Rule reference */
  rule: string;
}

export const PURE_AGENT_CONFIG: PureAgentConfig = {
  serviceFeeGstRate: 0.18,      // 18% GST on service fee only
  conditions: [
    'Agent enters contract with customer to act as pure agent',
    'Customer authorizes agent to incur expenses on their behalf',
    'Payment for such services is made separately to actual service provider',
    'Agent does not hold title to goods/services procured',
    'Agent\'s service fee is charged separately'
  ],
  requiredDocuments: [
    'Authorization letter from customer',
    'Invoices from actual service providers in customer\'s name',
    'Payment proof to service providers',
    'Separate invoice for agent\'s service fee'
  ],
  rule: 'Rule 33 of CGST Rules, 2017'
};

// ============================================================================
// NOMENCLATURE - Customer-Facing Terms
// ============================================================================

/**
 * These terms are used on customer-facing documents (invoices)
 * to avoid showing internal terminology like "markup" or "profit"
 */
export const NOMENCLATURE = {
  // Profit/Markup alternatives
  markup: 'Service Charges',
  profit: 'Service Charges',
  commission: 'Service Charges',

  // Specific service descriptions
  airlineBookingFee: 'Airline Facilitation Charges',
  hotelBookingFee: 'Hotel Facilitation Charges',
  visaAssistance: 'Visa Facilitation Charges',
  transferArrangement: 'Transfer Arrangement Charges',
  tourManagement: 'Tour Management Charges',
  packageCoordination: 'Package Coordination Charges',

  // Tax labels
  tcs: 'TCS u/s 206C(1G)',
  cgst: 'CGST',
  sgst: 'SGST',
  igst: 'IGST',

  // Document types
  invoice: 'Tax Invoice',
  proforma: 'Proforma Invoice',
  debitNote: 'Debit Note',
  creditNote: 'Credit Note',
  quotation: 'Quotation',
  receipt: 'Receipt'
} as const;

// ============================================================================
// VERSION & UPDATE INFO
// ============================================================================

export const TAX_LAWS_VERSION = {
  version: '1.0.0',
  lastUpdated: '2025-01-02',
  updatedBy: 'TourCompliance Pro System',
  changelog: [
    {
      date: '2025-01-02',
      version: '1.0.0',
      changes: [
        'Initial release with FY 2024-25 rates',
        'Added FY 2025-26 rates with ₹10L TCS threshold',
        'Implemented Section 269ST cash limits with minor restriction',
        'Added Pure Agent rules (Rule 33)',
        'Added all state codes for GST'
      ]
    }
  ]
};
