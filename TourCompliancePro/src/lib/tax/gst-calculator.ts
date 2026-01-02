/**
 * TourCompliance Pro - GST Calculator
 * =====================================
 *
 * Implements GST calculation for tour operators with support for:
 * 1. Direct Supply: Full GST on package value
 * 2. Pure Agent: GST only on service fee
 * 3. Intrastate (CGST + SGST) and Interstate (IGST)
 * 4. Exports and SEZ (Zero-rated)
 * 5. Multiple GST rates within same invoice
 */

import {
  GST_CONFIG,
  SAC_CODES,
  getStateFromGSTIN,
  isInterstate as checkInterstate
} from '@/config/tax-laws';
import { GSTDetails, GSTType, SupplyType, LineItem } from '@/types';

export interface GSTCalculationInput {
  /** Line items in the invoice */
  lineItems: LineItem[];

  /** Seller's GSTIN (Tour operator) */
  sellerGstin: string;

  /** Buyer's GSTIN (optional - unregistered buyers) */
  buyerGstin?: string;

  /** Buyer's state code (required if no GSTIN) */
  buyerStateCode?: string;

  /** Supply type */
  supplyType: SupplyType;

  /** Is this an export? */
  isExport: boolean;

  /** Is buyer in SEZ? */
  isSEZ: boolean;

  /** Place of supply state code */
  placeOfSupplyCode: string;
}

export interface GSTCalculationResult extends GSTDetails {
  /** Line items with GST calculated */
  lineItemsWithGst: (LineItem & {
    gstBreakdown: {
      taxableValue: number;
      cgst: number;
      sgst: number;
      igst: number;
      total: number;
    };
  })[];

  /** Summary by GST rate */
  rateSummary: {
    rate: number;
    taxableValue: number;
    cgst: number;
    sgst: number;
    igst: number;
    total: number;
  }[];

  /** Warnings or notes */
  warnings: string[];
}

/**
 * Calculate GST for an invoice
 */
export function calculateGST(input: GSTCalculationInput): GSTCalculationResult {
  const {
    lineItems,
    sellerGstin,
    buyerGstin,
    buyerStateCode,
    supplyType,
    isExport,
    isSEZ,
    placeOfSupplyCode
  } = input;

  const warnings: string[] = [];

  // Determine GST type
  let gstType: GSTType;
  if (isExport) {
    gstType = GSTType.EXPORT;
  } else if (isSEZ) {
    gstType = GSTType.SEZ;
  } else if (checkInterstate(sellerGstin, buyerGstin, buyerStateCode || placeOfSupplyCode)) {
    gstType = GSTType.IGST;
  } else {
    gstType = GSTType.CGST_SGST;
  }

  // Validate seller GSTIN
  const sellerState = getStateFromGSTIN(sellerGstin);
  if (!sellerState) {
    throw new Error('Invalid seller GSTIN. Cannot determine state.');
  }

  // Process each line item
  const lineItemsWithGst = lineItems.map(item => {
    let taxableValue: number;
    let gstRate: number;

    // For Pure Agent items, GST only on service fee
    if (supplyType === SupplyType.PURE_AGENT && item.isPureAgent) {
      taxableValue = item.serviceFee;
      gstRate = GST_CONFIG.rateWithITC; // 18% on service fee

      if (item.amount > item.serviceFee) {
        warnings.push(
          `Pure Agent: GST of ${(gstRate * 100).toFixed(0)}% calculated only on service fee (₹${item.serviceFee.toLocaleString('en-IN')}), ` +
          `not on principal amount (₹${(item.amount - item.serviceFee).toLocaleString('en-IN')}) for "${item.description}".`
        );
      }
    } else {
      taxableValue = item.amount;
      gstRate = item.gstRate || GST_CONFIG.standardRate;
    }

    // Calculate GST based on type
    let cgst = 0, sgst = 0, igst = 0, totalGst = 0;

    if (gstType === GSTType.EXPORT || gstType === GSTType.SEZ) {
      // Zero-rated
      cgst = 0;
      sgst = 0;
      igst = 0;
      totalGst = 0;
    } else if (gstType === GSTType.IGST) {
      // Interstate - only IGST
      igst = roundCurrency(taxableValue * gstRate);
      totalGst = igst;
    } else {
      // Intrastate - CGST + SGST (equal split)
      const halfRate = gstRate / 2;
      cgst = roundCurrency(taxableValue * halfRate);
      sgst = roundCurrency(taxableValue * halfRate);
      totalGst = cgst + sgst;
    }

    return {
      ...item,
      gstRate,
      gstAmount: totalGst,
      gstBreakdown: {
        taxableValue,
        cgst,
        sgst,
        igst,
        total: totalGst
      }
    };
  });

  // Calculate totals
  const totalTaxableValue = lineItemsWithGst.reduce((sum, item) => sum + item.gstBreakdown.taxableValue, 0);
  const totalCgst = lineItemsWithGst.reduce((sum, item) => sum + item.gstBreakdown.cgst, 0);
  const totalSgst = lineItemsWithGst.reduce((sum, item) => sum + item.gstBreakdown.sgst, 0);
  const totalIgst = lineItemsWithGst.reduce((sum, item) => sum + item.gstBreakdown.igst, 0);
  const totalGst = totalCgst + totalSgst + totalIgst;

  // Create rate-wise summary
  const rateMap = new Map<number, {
    rate: number;
    taxableValue: number;
    cgst: number;
    sgst: number;
    igst: number;
    total: number;
  }>();

  for (const item of lineItemsWithGst) {
    const existing = rateMap.get(item.gstRate) || {
      rate: item.gstRate,
      taxableValue: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      total: 0
    };

    existing.taxableValue += item.gstBreakdown.taxableValue;
    existing.cgst += item.gstBreakdown.cgst;
    existing.sgst += item.gstBreakdown.sgst;
    existing.igst += item.gstBreakdown.igst;
    existing.total += item.gstBreakdown.total;

    rateMap.set(item.gstRate, existing);
  }

  const rateSummary = Array.from(rateMap.values()).sort((a, b) => a.rate - b.rate);

  // Create breakdown by rate for GSTDetails
  const breakdownByRate = rateSummary.map(s => ({
    rate: s.rate,
    taxableValue: s.taxableValue,
    cgst: s.cgst,
    sgst: s.sgst,
    igst: s.igst,
    total: s.total
  }));

  // Add export/SEZ notes
  if (gstType === GSTType.EXPORT) {
    warnings.push('Export invoice: Zero-rated supply. GST not charged. LUT/Bond required for zero-rating.');
  } else if (gstType === GSTType.SEZ) {
    warnings.push('SEZ supply: Zero-rated. Ensure SEZ endorsement on invoice.');
  }

  return {
    type: gstType,
    taxableValue: totalTaxableValue,

    cgstRate: gstType === GSTType.CGST_SGST ? GST_CONFIG.cgstRate : 0,
    cgstAmount: totalCgst,
    sgstRate: gstType === GSTType.CGST_SGST ? GST_CONFIG.sgstRate : 0,
    sgstAmount: totalSgst,

    igstRate: gstType === GSTType.IGST ? GST_CONFIG.igstRate : 0,
    igstAmount: totalIgst,

    totalGst,
    breakdownByRate,

    lineItemsWithGst,
    rateSummary,
    warnings
  };
}

/**
 * Calculate GST for Pure Agent model specifically
 *
 * In Pure Agent model:
 * - Principal amount (e.g., airline ticket) → NO GST
 * - Service fee (your commission) → 18% GST
 */
export function calculatePureAgentGST(
  principalAmount: number,
  serviceFee: number,
  isInterstate: boolean
): {
  principalAmount: number;
  serviceFee: number;
  gstOnServiceFee: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalPayable: number;
  breakdown: string;
} {
  const gstRate = GST_CONFIG.rateWithITC; // 18%
  const gstAmount = roundCurrency(serviceFee * gstRate);

  let cgst = 0, sgst = 0, igst = 0;

  if (isInterstate) {
    igst = gstAmount;
  } else {
    cgst = roundCurrency(gstAmount / 2);
    sgst = roundCurrency(gstAmount / 2);
  }

  const totalPayable = principalAmount + serviceFee + gstAmount;

  const breakdown = `
Pure Agent Calculation:
─────────────────────────────────
Principal Amount (to supplier):    ₹${principalAmount.toLocaleString('en-IN')}
  → No GST (paid directly to supplier)

Service Fee (your charge):         ₹${serviceFee.toLocaleString('en-IN')}
  → GST @ ${(gstRate * 100).toFixed(0)}%:            ₹${gstAmount.toLocaleString('en-IN')}
    ${isInterstate
      ? `IGST: ₹${igst.toLocaleString('en-IN')}`
      : `CGST: ₹${cgst.toLocaleString('en-IN')} + SGST: ₹${sgst.toLocaleString('en-IN')}`
    }

─────────────────────────────────
Total Payable by Customer:         ₹${totalPayable.toLocaleString('en-IN')}
  `.trim();

  return {
    principalAmount,
    serviceFee,
    gstOnServiceFee: gstAmount,
    cgst,
    sgst,
    igst,
    totalPayable,
    breakdown
  };
}

/**
 * Validate GSTIN format
 */
export function validateGSTIN(gstin: string): {
  valid: boolean;
  stateCode?: string;
  stateName?: string;
  panInGstin?: string;
  error?: string;
} {
  if (!gstin) {
    return { valid: false, error: 'GSTIN is required' };
  }

  // GSTIN format: 2 digit state code + 10 digit PAN + 1 digit entity + 1 check digit + 1 digit (Z default)
  // Example: 27AAPFU0939F1Z5
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

  if (!gstinRegex.test(gstin)) {
    return { valid: false, error: 'Invalid GSTIN format. Expected: 27AAPFU0939F1Z5' };
  }

  const stateCode = gstin.substring(0, 2);
  const stateInfo = getStateFromGSTIN(gstin);

  if (!stateInfo) {
    return { valid: false, error: `Invalid state code: ${stateCode}` };
  }

  const panInGstin = gstin.substring(2, 12);

  return {
    valid: true,
    stateCode,
    stateName: stateInfo.name,
    panInGstin
  };
}

/**
 * Get HSN/SAC code for a service type
 */
export function getSACCode(serviceType: keyof typeof SAC_CODES): {
  code: string;
  description: string;
  rate: number;
} {
  return SAC_CODES[serviceType];
}

/**
 * Round to 2 decimal places
 */
function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100;
}

// ============================================================================
// TEST CASES
// ============================================================================

export const GST_TEST_CASES = [
  {
    name: 'Direct Supply - Intrastate',
    input: {
      lineItems: [{
        id: '1',
        description: 'Dubai Tour Package',
        sacCode: '998555',
        quantity: 1,
        unitPrice: 100000,
        amount: 100000,
        isPureAgent: false,
        serviceFee: 0,
        serviceFeeGst: 0,
        gstRate: 0.18,
        gstAmount: 0,
        displayName: 'Dubai Tour Package'
      }],
      sellerGstin: '27AAPFU0939F1Z5',
      buyerStateCode: '27',
      supplyType: SupplyType.DIRECT,
      isExport: false,
      isSEZ: false,
      placeOfSupplyCode: '27'
    },
    expected: {
      type: GSTType.CGST_SGST,
      cgstAmount: 9000,
      sgstAmount: 9000,
      totalGst: 18000
    }
  },
  {
    name: 'Direct Supply - Interstate',
    input: {
      lineItems: [{
        id: '1',
        description: 'Dubai Tour Package',
        sacCode: '998555',
        quantity: 1,
        unitPrice: 100000,
        amount: 100000,
        isPureAgent: false,
        serviceFee: 0,
        serviceFeeGst: 0,
        gstRate: 0.18,
        gstAmount: 0,
        displayName: 'Dubai Tour Package'
      }],
      sellerGstin: '27AAPFU0939F1Z5',
      buyerStateCode: '07', // Delhi
      supplyType: SupplyType.DIRECT,
      isExport: false,
      isSEZ: false,
      placeOfSupplyCode: '07'
    },
    expected: {
      type: GSTType.IGST,
      igstAmount: 18000,
      totalGst: 18000
    }
  },
  {
    name: 'Pure Agent Model',
    input: {
      lineItems: [{
        id: '1',
        description: 'Flight Booking (Pure Agent)',
        sacCode: '996421',
        quantity: 1,
        unitPrice: 250000,
        amount: 250000,
        isPureAgent: true,
        serviceFee: 7500,
        serviceFeeGst: 0,
        gstRate: 0.18,
        gstAmount: 0,
        displayName: 'Airline Facilitation Charges'
      }],
      sellerGstin: '27AAPFU0939F1Z5',
      buyerStateCode: '27',
      supplyType: SupplyType.PURE_AGENT,
      isExport: false,
      isSEZ: false,
      placeOfSupplyCode: '27'
    },
    expected: {
      // GST only on service fee (7500), not on principal (250000)
      taxableValue: 7500,
      cgstAmount: 675,  // 9% of 7500
      sgstAmount: 675,  // 9% of 7500
      totalGst: 1350
    }
  },
  {
    name: 'Export - Zero Rated',
    input: {
      lineItems: [{
        id: '1',
        description: 'India Tour for Foreign Tourist',
        sacCode: '998555',
        quantity: 1,
        unitPrice: 200000,
        amount: 200000,
        isPureAgent: false,
        serviceFee: 0,
        serviceFeeGst: 0,
        gstRate: 0,
        gstAmount: 0,
        displayName: 'India Tour Package'
      }],
      sellerGstin: '27AAPFU0939F1Z5',
      buyerStateCode: '',
      supplyType: SupplyType.DIRECT,
      isExport: true,
      isSEZ: false,
      placeOfSupplyCode: ''
    },
    expected: {
      type: GSTType.EXPORT,
      totalGst: 0
    }
  }
];
