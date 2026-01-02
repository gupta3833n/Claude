/**
 * TourCompliance Pro - Section 269ST Cash Limit Validator
 * =========================================================
 *
 * Implements cash payment limit validation as per Section 269ST.
 *
 * Key Rules:
 * 1. Maximum ₹2,00,000 cash per person per day/transaction/event
 * 2. ONLY ADULTS (18+) can pay cash - minors cannot enter valid contracts
 * 3. Penalty for violation: 100% of excess amount
 * 4. Liability is on the RECEIVER (tour operator), not the payer
 */

import { CASH_LIMIT_CONFIG, calculateMaxCashAllowed } from '@/config/tax-laws';
import { CashLimitDetails, Traveler } from '@/types';

export interface CashValidationInput {
  /** List of travelers */
  travelers: Traveler[];

  /** Total booking amount */
  bookingAmount: number;

  /** Cash amount to be received */
  cashAmount: number;

  /** Other payment modes amount */
  otherPaymentAmount?: number;

  /** Name of person paying cash (must be adult traveler) */
  cashPayerName?: string;
}

export interface CashValidationResult extends CashLimitDetails {
  /** Is the cash payment valid? */
  isValid: boolean;

  /** Detailed validation messages */
  messages: {
    type: 'INFO' | 'WARNING' | 'ERROR';
    message: string;
  }[];

  /** Suggested payment structure */
  suggestion?: {
    maxCash: number;
    minOtherPayment: number;
    message: string;
  };
}

/**
 * Validate cash payment against Section 269ST limits
 */
export function validateCashPayment(input: CashValidationInput): CashValidationResult {
  const {
    travelers,
    bookingAmount,
    cashAmount,
    otherPaymentAmount = 0,
    cashPayerName
  } = input;

  const messages: CashValidationResult['messages'] = [];

  // Count adults and minors
  const adultTravelers = travelers.filter(t => t.isAdult || calculateAge(t.dateOfBirth) >= 18);
  const minorTravelers = travelers.filter(t => !t.isAdult && calculateAge(t.dateOfBirth) < 18);

  const adultCount = adultTravelers.length;
  const minorCount = minorTravelers.length;

  // Calculate max cash allowed
  const { maxCash, warningMessage } = calculateMaxCashAllowed(adultCount, minorCount);

  if (warningMessage) {
    messages.push({
      type: minorCount > 0 && adultCount === 0 ? 'ERROR' : 'WARNING',
      message: warningMessage
    });
  }

  // Validate if cash payer is an adult traveler
  if (cashAmount > 0 && cashPayerName) {
    const payerTraveler = travelers.find(
      t => t.name.toLowerCase() === cashPayerName.toLowerCase()
    );

    if (!payerTraveler) {
      messages.push({
        type: 'WARNING',
        message: `Cash payer "${cashPayerName}" is not in the traveler list. Ensure they are an adult (18+) to accept cash.`
      });
    } else if (!payerTraveler.isAdult && calculateAge(payerTraveler.dateOfBirth) < 18) {
      messages.push({
        type: 'ERROR',
        message: `Cannot accept cash from minor "${cashPayerName}". As per Indian Contract Act, contracts with minors are void ab initio. Only adults (18+) can make cash payments.`
      });
    }
  }

  // Check if cash amount exceeds limit
  let isCompliant = true;
  let violationAmount = 0;
  let penaltyAmount = 0;

  if (cashAmount > maxCash) {
    isCompliant = false;
    violationAmount = cashAmount - maxCash;
    penaltyAmount = violationAmount * CASH_LIMIT_CONFIG.penaltyRate;

    messages.push({
      type: 'ERROR',
      message: `VIOLATION: Cash payment of ₹${cashAmount.toLocaleString('en-IN')} exceeds limit of ₹${maxCash.toLocaleString('en-IN')} (${adultCount} adult(s) × ₹2,00,000). ` +
        `Excess: ₹${violationAmount.toLocaleString('en-IN')}. Potential penalty: ₹${penaltyAmount.toLocaleString('en-IN')} (100% of violation).`
    });
  } else if (cashAmount > 0) {
    messages.push({
      type: 'INFO',
      message: `Cash payment of ₹${cashAmount.toLocaleString('en-IN')} is within limit of ₹${maxCash.toLocaleString('en-IN')}. ` +
        `Remaining cash headroom: ₹${(maxCash - cashAmount).toLocaleString('en-IN')}.`
    });
  }

  // Validate total payment covers booking
  const totalPayment = cashAmount + otherPaymentAmount;
  if (totalPayment < bookingAmount) {
    messages.push({
      type: 'WARNING',
      message: `Payment shortfall: ₹${(bookingAmount - totalPayment).toLocaleString('en-IN')} pending. ` +
        `Booking: ₹${bookingAmount.toLocaleString('en-IN')}, Received: ₹${totalPayment.toLocaleString('en-IN')}.`
    });
  }

  // Generate suggestion if violation
  let suggestion: CashValidationResult['suggestion'] | undefined;
  if (!isCompliant) {
    const minOtherPayment = cashAmount - maxCash;
    suggestion = {
      maxCash,
      minOtherPayment,
      message: `To comply with Section 269ST, accept maximum ₹${maxCash.toLocaleString('en-IN')} in cash. ` +
        `Remaining ₹${minOtherPayment.toLocaleString('en-IN')} must be paid via bank transfer, UPI, cheque, or card.`
    };
  }

  return {
    maxCashAllowed: maxCash,
    adultCount,
    minorCount,
    cashReceived: cashAmount,
    isCompliant,
    warningMessage: messages.find(m => m.type === 'ERROR' || m.type === 'WARNING')?.message,
    violationAmount: isCompliant ? undefined : violationAmount,
    penaltyAmount: isCompliant ? undefined : penaltyAmount,
    isValid: isCompliant,
    messages,
    suggestion
  };
}

/**
 * Calculate age from date of birth
 */
function calculateAge(dob: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  return age;
}

/**
 * Check if a person is an adult (18+)
 */
export function isAdult(dob: Date): boolean {
  return calculateAge(dob) >= 18;
}

/**
 * Get optimized cash payment structure for a booking
 *
 * This helps split payments to stay within 269ST limits
 */
export function optimizeCashPayment(
  bookingAmount: number,
  adultCount: number,
  minorCount: number,
  preferredCashAmount?: number
): {
  maxCash: number;
  recommendedCash: number;
  minimumOtherPayment: number;
  paymentBreakdown: {
    cash: number;
    other: number;
    perAdultCash: number;
  };
  warnings: string[];
} {
  const warnings: string[] = [];

  // Calculate max cash
  const { maxCash, warningMessage } = calculateMaxCashAllowed(adultCount, minorCount);

  if (warningMessage) {
    warnings.push(warningMessage);
  }

  // If no adults, no cash allowed
  if (adultCount === 0) {
    return {
      maxCash: 0,
      recommendedCash: 0,
      minimumOtherPayment: bookingAmount,
      paymentBreakdown: {
        cash: 0,
        other: bookingAmount,
        perAdultCash: 0
      },
      warnings
    };
  }

  // Calculate recommended cash (capped at max)
  let recommendedCash = preferredCashAmount ?? Math.min(bookingAmount, maxCash);
  recommendedCash = Math.min(recommendedCash, maxCash);

  const minimumOtherPayment = Math.max(0, bookingAmount - maxCash);
  const perAdultCash = adultCount > 0 ? recommendedCash / adultCount : 0;

  // Add warning if booking exceeds cash limit
  if (bookingAmount > maxCash) {
    warnings.push(
      `Booking amount (₹${bookingAmount.toLocaleString('en-IN')}) exceeds cash limit (₹${maxCash.toLocaleString('en-IN')}). ` +
      `Minimum ₹${minimumOtherPayment.toLocaleString('en-IN')} must be paid via non-cash modes.`
    );
  }

  return {
    maxCash,
    recommendedCash,
    minimumOtherPayment,
    paymentBreakdown: {
      cash: recommendedCash,
      other: bookingAmount - recommendedCash,
      perAdultCash
    },
    warnings
  };
}

/**
 * Generate cash receipt details for compliance documentation
 */
export function generateCashReceiptDetails(
  travelers: Traveler[],
  cashAmount: number
): {
  receiptLines: {
    payerName: string;
    amount: number;
    limitUsed: number;
    remainingLimit: number;
  }[];
  totalCash: number;
  complianceNote: string;
} {
  const adults = travelers.filter(t => isAdult(t.dateOfBirth));
  const perPersonLimit = CASH_LIMIT_CONFIG.limitPerPerson;

  // Distribute cash among adults
  const perPersonCash = adults.length > 0 ? cashAmount / adults.length : 0;

  const receiptLines = adults.map(adult => ({
    payerName: adult.name,
    amount: Math.min(perPersonCash, perPersonLimit),
    limitUsed: Math.min(perPersonCash, perPersonLimit),
    remainingLimit: perPersonLimit - Math.min(perPersonCash, perPersonLimit)
  }));

  const complianceNote =
    `Cash received as per Section 269ST compliance. ` +
    `${adults.length} adult traveler(s) × ₹${perPersonLimit.toLocaleString('en-IN')} limit = ` +
    `₹${(adults.length * perPersonLimit).toLocaleString('en-IN')} maximum allowed. ` +
    `Total cash received: ₹${cashAmount.toLocaleString('en-IN')}.`;

  return {
    receiptLines,
    totalCash: cashAmount,
    complianceNote
  };
}

// ============================================================================
// TEST CASES
// ============================================================================

export const CASH_LIMIT_TEST_CASES = [
  {
    name: '2 Adults - Within Limit',
    input: {
      travelers: [
        { id: '1', name: 'John Doe', dateOfBirth: new Date(1990, 0, 1), age: 35, isAdult: true, nationality: 'Indian' },
        { id: '2', name: 'Jane Doe', dateOfBirth: new Date(1992, 5, 15), age: 33, isAdult: true, nationality: 'Indian' }
      ],
      bookingAmount: 500000,
      cashAmount: 350000
    },
    expected: {
      isCompliant: true,
      maxCashAllowed: 400000  // 2 × 2L
    }
  },
  {
    name: '2 Adults - Exceeds Limit',
    input: {
      travelers: [
        { id: '1', name: 'John Doe', dateOfBirth: new Date(1990, 0, 1), age: 35, isAdult: true, nationality: 'Indian' },
        { id: '2', name: 'Jane Doe', dateOfBirth: new Date(1992, 5, 15), age: 33, isAdult: true, nationality: 'Indian' }
      ],
      bookingAmount: 600000,
      cashAmount: 500000
    },
    expected: {
      isCompliant: false,
      maxCashAllowed: 400000,
      violationAmount: 100000,
      penaltyAmount: 100000
    }
  },
  {
    name: '2 Adults + 1 Minor',
    input: {
      travelers: [
        { id: '1', name: 'John Doe', dateOfBirth: new Date(1990, 0, 1), age: 35, isAdult: true, nationality: 'Indian' },
        { id: '2', name: 'Jane Doe', dateOfBirth: new Date(1992, 5, 15), age: 33, isAdult: true, nationality: 'Indian' },
        { id: '3', name: 'Kid Doe', dateOfBirth: new Date(2015, 3, 20), age: 10, isAdult: false, nationality: 'Indian' }
      ],
      bookingAmount: 700000,
      cashAmount: 400000
    },
    expected: {
      isCompliant: true,
      maxCashAllowed: 400000,  // Only 2 adults count
      adultCount: 2,
      minorCount: 1
    }
  },
  {
    name: 'Only Minors - No Cash Allowed',
    input: {
      travelers: [
        { id: '1', name: 'Kid One', dateOfBirth: new Date(2012, 0, 1), age: 13, isAdult: false, nationality: 'Indian' },
        { id: '2', name: 'Kid Two', dateOfBirth: new Date(2015, 5, 15), age: 10, isAdult: false, nationality: 'Indian' }
      ],
      bookingAmount: 200000,
      cashAmount: 50000
    },
    expected: {
      isCompliant: false,
      maxCashAllowed: 0,
      adultCount: 0,
      minorCount: 2
    }
  },
  {
    name: 'Zero Cash Payment',
    input: {
      travelers: [
        { id: '1', name: 'John Doe', dateOfBirth: new Date(1990, 0, 1), age: 35, isAdult: true, nationality: 'Indian' }
      ],
      bookingAmount: 500000,
      cashAmount: 0,
      otherPaymentAmount: 500000
    },
    expected: {
      isCompliant: true,
      maxCashAllowed: 200000
    }
  }
];
