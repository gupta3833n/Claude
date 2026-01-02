/**
 * TourCompliance Pro - TCS Calculator
 * ====================================
 *
 * Implements TCS calculation as per Section 206C(1G) using SLAB METHOD.
 *
 * CRITICAL: TCS applies from RUPEE 1 (₹1)
 * ========================================
 * There is NO exemption threshold for overseas tour packages.
 * The threshold (₹7L for FY 2024-25, ₹10L for FY 2025-26) only determines
 * where the RATE CHANGES from 5% to 20%. It is NOT an exemption limit.
 *
 * Key Rules:
 * 1. TCS applies to overseas tour packages from the FIRST RUPEE
 * 2. Threshold is per PAN per Financial Year (determines rate change point)
 * 3. Rate 1 (5%) applies up to threshold
 * 4. Rate 2 (20%) applies above threshold
 * 5. SLAB METHOD: If a transaction crosses threshold, split calculation
 *
 * Example: ₹5,00,000 package (first booking of FY, threshold ₹7L)
 * - TCS = ₹5,00,000 × 5% = ₹25,000 (NOT exempt, charged from ₹1)
 *
 * Exemptions (where TCS is NOT applicable):
 * - Pure Agent: No TCS (acting on behalf of customer under Rule 33)
 * - Commission Agent: No TCS on commission portion only
 * - Domestic packages: No TCS under this section (only overseas)
 *
 * Reference: Section 206C(1G) of Income Tax Act, 1961
 * Source: https://cleartax.in/s/tcs-on-overseas-tour-package
 */

import {
  getTCSConfig,
  getCurrentFinancialYear,
  getFinancialYearForDate
} from '@/config/tax-laws';
import { TCSDetails, TCSExemptionReason } from '@/types';

export interface TCSCalculationInput {
  /** Current package/booking value */
  packageValue: number;

  /** Cumulative booking amount for this PAN in current FY (before this booking) */
  previousCumulative: number;

  /** Date of booking (to determine applicable FY rules) */
  bookingDate?: Date;

  /** Is this an overseas package? (TCS only for international) */
  isInternational: boolean;

  /** Does buyer have PAN? (higher rate if no PAN) */
  hasPan: boolean;

  /** Exemption reason if applicable */
  exemptionReason?: TCSExemptionReason;
}

export interface TCSCalculationResult extends TCSDetails {
  /** Detailed breakdown for display */
  breakdown: {
    slabDescription: string;
    amount: number;
    rate: number;
    tcs: number;
  }[];

  /** Warning messages if any */
  warnings: string[];
}

/**
 * Calculate TCS using the SLAB METHOD
 *
 * @example
 * // Previous cumulative: ₹8,00,000
 * // New package: ₹5,00,000
 * // Threshold (FY 2024-25): ₹7,00,000
 *
 * // Since previous (8L) > threshold (7L), entire amount at 20%
 * // TCS = 5,00,000 × 20% = ₹1,00,000
 *
 * @example
 * // Previous cumulative: ₹5,00,000
 * // New package: ₹4,00,000
 * // Threshold: ₹7,00,000
 *
 * // Amount to fill threshold: 7L - 5L = ₹2,00,000 at 5%
 * // Remaining: 4L - 2L = ₹2,00,000 at 20%
 * // TCS = (2L × 5%) + (2L × 20%) = 10,000 + 40,000 = ₹50,000
 */
export function calculateTCS(input: TCSCalculationInput): TCSCalculationResult {
  const {
    packageValue,
    previousCumulative,
    bookingDate = new Date(),
    isInternational,
    hasPan,
    exemptionReason = TCSExemptionReason.NONE
  } = input;

  const warnings: string[] = [];
  const breakdown: TCSCalculationResult['breakdown'] = [];

  // Get FY-specific TCS config
  const fyConfig = getFinancialYearForDate(bookingDate);
  const tcsConfig = getTCSConfig(fyConfig.code);

  // Check for exemptions first
  if (!isInternational) {
    return createExemptResult(
      packageValue,
      previousCumulative,
      tcsConfig.threshold,
      TCSExemptionReason.DOMESTIC_PACKAGE,
      'TCS under Section 206C(1G) applies only to overseas tour packages. Domestic packages are exempt.'
    );
  }

  if (exemptionReason === TCSExemptionReason.PURE_AGENT) {
    return createExemptResult(
      packageValue,
      previousCumulative,
      tcsConfig.threshold,
      TCSExemptionReason.PURE_AGENT,
      'Pure Agent model: No TCS applicable as you are acting on behalf of customer. Customer pays supplier directly.'
    );
  }

  if (exemptionReason === TCSExemptionReason.COMMISSION_AGENT) {
    return createExemptResult(
      packageValue,
      previousCumulative,
      tcsConfig.threshold,
      TCSExemptionReason.COMMISSION_AGENT,
      'Commission Agent: TCS not applicable on commission portion. TCS may apply on principal if you handle that.'
    );
  }

  if (exemptionReason === TCSExemptionReason.GOVERNMENT_ENTITY) {
    return createExemptResult(
      packageValue,
      previousCumulative,
      tcsConfig.threshold,
      TCSExemptionReason.GOVERNMENT_ENTITY,
      'Government entities are exempt from TCS under Section 206C(1G).'
    );
  }

  // Validate inputs
  if (packageValue < 0) {
    throw new Error('Package value cannot be negative');
  }

  if (previousCumulative < 0) {
    throw new Error('Previous cumulative amount cannot be negative');
  }

  // Determine applicable rates
  const rate1 = hasPan ? tcsConfig.rate1 : tcsConfig.rateWithoutPan;
  const rate2 = hasPan ? tcsConfig.rate2 : Math.max(tcsConfig.rate2, tcsConfig.rateWithoutPan);

  if (!hasPan) {
    warnings.push(`Higher TCS rate applied (${(rate1 * 100).toFixed(0)}%) as PAN is not provided. Advise customer to provide PAN to reduce TCS.`);
  }

  const threshold = tcsConfig.threshold;
  const newCumulative = previousCumulative + packageValue;

  let amountAt5 = 0;
  let tcsAt5 = 0;
  let amountAt20 = 0;
  let tcsAt20 = 0;
  let totalTcs = 0;

  // CASE 1: Entire amount below threshold (including this booking)
  if (newCumulative <= threshold) {
    amountAt5 = packageValue;
    tcsAt5 = roundCurrency(amountAt5 * rate1);
    totalTcs = tcsAt5;

    breakdown.push({
      slabDescription: `Up to ₹${formatIndianNumber(threshold)} (${(rate1 * 100).toFixed(0)}%)`,
      amount: amountAt5,
      rate: rate1,
      tcs: tcsAt5
    });
  }
  // CASE 2: Already above threshold before this booking
  else if (previousCumulative >= threshold) {
    amountAt20 = packageValue;
    tcsAt20 = roundCurrency(amountAt20 * rate2);
    totalTcs = tcsAt20;

    breakdown.push({
      slabDescription: `Above ₹${formatIndianNumber(threshold)} (${(rate2 * 100).toFixed(0)}%)`,
      amount: amountAt20,
      rate: rate2,
      tcs: tcsAt20
    });

    warnings.push(`Customer has already crossed the ₹${formatIndianNumber(threshold)} threshold in this FY. Entire amount taxed at ${(rate2 * 100).toFixed(0)}%.`);
  }
  // CASE 3: SLAB METHOD - This booking crosses the threshold
  else {
    // Amount that fits within threshold
    amountAt5 = threshold - previousCumulative;
    tcsAt5 = roundCurrency(amountAt5 * rate1);

    // Amount above threshold
    amountAt20 = packageValue - amountAt5;
    tcsAt20 = roundCurrency(amountAt20 * rate2);

    totalTcs = tcsAt5 + tcsAt20;

    breakdown.push({
      slabDescription: `Up to threshold (${(rate1 * 100).toFixed(0)}%)`,
      amount: amountAt5,
      rate: rate1,
      tcs: tcsAt5
    });

    breakdown.push({
      slabDescription: `Above threshold (${(rate2 * 100).toFixed(0)}%)`,
      amount: amountAt20,
      rate: rate2,
      tcs: tcsAt20
    });

    warnings.push(`This booking crosses the ₹${formatIndianNumber(threshold)} threshold. TCS calculated using slab method.`);
  }

  // Calculate effective rate for display
  const effectiveRate = packageValue > 0 ? totalTcs / packageValue : 0;

  return {
    applicable: true,
    exemptionReason: TCSExemptionReason.NONE,

    previousCumulative,
    currentBookingValue: packageValue,
    newCumulative,

    thresholdApplied: threshold,
    amountAt5Percent: amountAt5,
    tcsAt5Percent: tcsAt5,
    amountAt20Percent: amountAt20,
    tcsAt20Percent: tcsAt20,

    totalTcs,
    effectiveRate,

    breakdown,
    warnings
  };
}

/**
 * Create an exempt TCS result
 */
function createExemptResult(
  packageValue: number,
  previousCumulative: number,
  threshold: number,
  reason: TCSExemptionReason,
  message: string
): TCSCalculationResult {
  return {
    applicable: false,
    exemptionReason: reason,

    previousCumulative,
    currentBookingValue: packageValue,
    newCumulative: previousCumulative + packageValue,

    thresholdApplied: threshold,
    amountAt5Percent: 0,
    tcsAt5Percent: 0,
    amountAt20Percent: 0,
    tcsAt20Percent: 0,

    totalTcs: 0,
    effectiveRate: 0,

    breakdown: [],
    warnings: [message]
  };
}

/**
 * Round to 2 decimal places (standard for Indian currency)
 */
function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Format number in Indian numbering system (lakhs, crores)
 */
function formatIndianNumber(num: number): string {
  const str = num.toString();
  let lastThree = str.substring(str.length - 3);
  const otherNumbers = str.substring(0, str.length - 3);

  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }

  return otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
}

/**
 * Get customer's cumulative booking amount for current FY
 * This should query the database - placeholder for now
 */
export async function getCustomerCumulativeForFY(
  customerId: string,
  financialYearCode?: string
): Promise<number> {
  // TODO: Implement database query
  // This should sum all package values for this customer in the given FY
  // excluding cancelled bookings

  const fyCode = financialYearCode || getCurrentFinancialYear().code;

  // Placeholder - will be implemented with database
  console.log(`Getting cumulative for customer ${customerId} in FY ${fyCode}`);
  return 0;
}

// ============================================================================
// TEST CASES (for verification)
// ============================================================================

/**
 * Test cases to verify TCS calculation logic
 * Run these in development to ensure accuracy
 */
export const TCS_TEST_CASES = [
  {
    name: 'Below threshold',
    input: {
      packageValue: 500000,
      previousCumulative: 0,
      isInternational: true,
      hasPan: true
    },
    expected: {
      totalTcs: 25000,  // 5% of 5L
      amountAt5: 500000,
      amountAt20: 0
    }
  },
  {
    name: 'Exactly at threshold (FY 2024-25, 7L)',
    input: {
      packageValue: 700000,
      previousCumulative: 0,
      bookingDate: new Date(2024, 6, 1), // July 2024
      isInternational: true,
      hasPan: true
    },
    expected: {
      totalTcs: 35000,  // 5% of 7L
      amountAt5: 700000,
      amountAt20: 0
    }
  },
  {
    name: 'Already above threshold',
    input: {
      packageValue: 500000,
      previousCumulative: 800000,  // Already crossed 7L
      bookingDate: new Date(2024, 6, 1),
      isInternational: true,
      hasPan: true
    },
    expected: {
      totalTcs: 100000,  // 20% of 5L
      amountAt5: 0,
      amountAt20: 500000
    }
  },
  {
    name: 'SLAB METHOD - Crossing threshold',
    input: {
      packageValue: 500000,
      previousCumulative: 500000,  // 5L previous, 7L threshold
      bookingDate: new Date(2024, 6, 1),
      isInternational: true,
      hasPan: true
    },
    expected: {
      // Amount at 5%: 7L - 5L = 2L → TCS = 10,000
      // Amount at 20%: 5L - 2L = 3L → TCS = 60,000
      // Total: 70,000
      totalTcs: 70000,
      amountAt5: 200000,
      amountAt20: 300000
    }
  },
  {
    name: 'FY 2025-26 with new 10L threshold',
    input: {
      packageValue: 500000,
      previousCumulative: 800000,
      bookingDate: new Date(2025, 6, 1), // July 2025 (FY 2025-26)
      isInternational: true,
      hasPan: true
    },
    expected: {
      // Previous: 8L, Threshold: 10L, Package: 5L
      // Amount at 5%: 10L - 8L = 2L → TCS = 10,000
      // Amount at 20%: 5L - 2L = 3L → TCS = 60,000
      totalTcs: 70000,
      amountAt5: 200000,
      amountAt20: 300000
    }
  },
  {
    name: 'Pure Agent - Exempt',
    input: {
      packageValue: 1000000,
      previousCumulative: 0,
      isInternational: true,
      hasPan: true,
      exemptionReason: TCSExemptionReason.PURE_AGENT
    },
    expected: {
      totalTcs: 0,
      applicable: false
    }
  },
  {
    name: 'Domestic package - Exempt',
    input: {
      packageValue: 1000000,
      previousCumulative: 0,
      isInternational: false,
      hasPan: true
    },
    expected: {
      totalTcs: 0,
      applicable: false
    }
  },
  {
    name: 'Without PAN - Higher rate',
    input: {
      packageValue: 500000,
      previousCumulative: 0,
      isInternational: true,
      hasPan: false
    },
    expected: {
      totalTcs: 50000,  // 10% of 5L (double rate)
      amountAt5: 500000
    }
  }
];

/**
 * Run all test cases and return results
 */
export function runTCSTests(): { passed: number; failed: number; results: unknown[] } {
  let passed = 0;
  let failed = 0;
  const results: unknown[] = [];

  for (const testCase of TCS_TEST_CASES) {
    try {
      const result = calculateTCS(testCase.input as TCSCalculationInput);
      const expected = testCase.expected;

      let testPassed = true;

      if (expected.totalTcs !== undefined && result.totalTcs !== expected.totalTcs) {
        testPassed = false;
      }
      if (expected.amountAt5 !== undefined && result.amountAt5Percent !== expected.amountAt5) {
        testPassed = false;
      }
      if (expected.amountAt20 !== undefined && result.amountAt20Percent !== expected.amountAt20) {
        testPassed = false;
      }
      if (expected.applicable !== undefined && result.applicable !== expected.applicable) {
        testPassed = false;
      }

      if (testPassed) {
        passed++;
        results.push({ name: testCase.name, status: 'PASSED', result });
      } else {
        failed++;
        results.push({ name: testCase.name, status: 'FAILED', expected, actual: result });
      }
    } catch (error) {
      failed++;
      results.push({ name: testCase.name, status: 'ERROR', error: (error as Error).message });
    }
  }

  return { passed, failed, results };
}
