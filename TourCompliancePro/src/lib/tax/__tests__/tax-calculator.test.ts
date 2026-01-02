/**
 * TourCompliance Pro - Tax Calculator Tests
 * ===========================================
 *
 * Test cases to verify all tax calculations are correct.
 *
 * Run with: npm test
 */

import { describe, it, expect } from 'vitest';
import { calculateTCS, TCS_TEST_CASES, type TCSCalculationInput } from '../tcs-calculator';
import { calculateGST, calculatePureAgentGST, validateGSTIN } from '../gst-calculator';
import { validateCashPayment, optimizeCashPayment } from '../cash-limit-validator';
import { TCSExemptionReason, SupplyType, GSTType } from '@/types';

// ============================================================================
// TCS CALCULATION TESTS
// ============================================================================

describe('TCS Calculator - Section 206C(1G)', () => {
  describe('Basic TCS Calculations', () => {
    it('should calculate 5% TCS when below threshold', () => {
      const result = calculateTCS({
        packageValue: 500000,
        previousCumulative: 0,
        isInternational: true,
        hasPan: true
      });

      expect(result.applicable).toBe(true);
      expect(result.totalTcs).toBe(25000); // 5% of 5L
      expect(result.amountAt5Percent).toBe(500000);
      expect(result.amountAt20Percent).toBe(0);
    });

    it('should calculate 20% TCS when already above threshold', () => {
      const result = calculateTCS({
        packageValue: 500000,
        previousCumulative: 800000,
        bookingDate: new Date(2024, 6, 1), // FY 2024-25, threshold 7L
        isInternational: true,
        hasPan: true
      });

      expect(result.applicable).toBe(true);
      expect(result.totalTcs).toBe(100000); // 20% of 5L
      expect(result.amountAt5Percent).toBe(0);
      expect(result.amountAt20Percent).toBe(500000);
    });

    it('should use SLAB METHOD when crossing threshold', () => {
      const result = calculateTCS({
        packageValue: 500000,
        previousCumulative: 500000,
        bookingDate: new Date(2024, 6, 1), // FY 2024-25, threshold 7L
        isInternational: true,
        hasPan: true
      });

      // Previous: 5L, Threshold: 7L, Package: 5L
      // Amount at 5%: 7L - 5L = 2L → TCS = 10,000
      // Amount at 20%: 5L - 2L = 3L → TCS = 60,000
      expect(result.applicable).toBe(true);
      expect(result.amountAt5Percent).toBe(200000);
      expect(result.tcsAt5Percent).toBe(10000);
      expect(result.amountAt20Percent).toBe(300000);
      expect(result.tcsAt20Percent).toBe(60000);
      expect(result.totalTcs).toBe(70000);
    });

    it('should use 10L threshold for FY 2025-26', () => {
      const result = calculateTCS({
        packageValue: 500000,
        previousCumulative: 800000,
        bookingDate: new Date(2025, 6, 1), // FY 2025-26, threshold 10L
        isInternational: true,
        hasPan: true
      });

      // Previous: 8L, Threshold: 10L, Package: 5L
      // Amount at 5%: 10L - 8L = 2L → TCS = 10,000
      // Amount at 20%: 5L - 2L = 3L → TCS = 60,000
      expect(result.amountAt5Percent).toBe(200000);
      expect(result.amountAt20Percent).toBe(300000);
      expect(result.totalTcs).toBe(70000);
    });
  });

  describe('TCS Exemptions', () => {
    it('should exempt domestic packages', () => {
      const result = calculateTCS({
        packageValue: 1000000,
        previousCumulative: 0,
        isInternational: false,
        hasPan: true
      });

      expect(result.applicable).toBe(false);
      expect(result.totalTcs).toBe(0);
      expect(result.exemptionReason).toBe(TCSExemptionReason.DOMESTIC_PACKAGE);
    });

    it('should exempt Pure Agent model', () => {
      const result = calculateTCS({
        packageValue: 1000000,
        previousCumulative: 0,
        isInternational: true,
        hasPan: true,
        exemptionReason: TCSExemptionReason.PURE_AGENT
      });

      expect(result.applicable).toBe(false);
      expect(result.totalTcs).toBe(0);
    });
  });

  describe('Higher TCS Rate Without PAN', () => {
    it('should apply 10% rate when PAN not provided', () => {
      const result = calculateTCS({
        packageValue: 500000,
        previousCumulative: 0,
        isInternational: true,
        hasPan: false
      });

      expect(result.totalTcs).toBe(50000); // 10% of 5L
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Pre-defined Test Cases', () => {
    TCS_TEST_CASES.forEach((testCase) => {
      it(`should pass: ${testCase.name}`, () => {
        const result = calculateTCS(testCase.input as TCSCalculationInput);

        if (testCase.expected.totalTcs !== undefined) {
          expect(result.totalTcs).toBe(testCase.expected.totalTcs);
        }
        if (testCase.expected.amountAt5 !== undefined) {
          expect(result.amountAt5Percent).toBe(testCase.expected.amountAt5);
        }
        if (testCase.expected.amountAt20 !== undefined) {
          expect(result.amountAt20Percent).toBe(testCase.expected.amountAt20);
        }
        if (testCase.expected.applicable !== undefined) {
          expect(result.applicable).toBe(testCase.expected.applicable);
        }
      });
    });
  });
});

// ============================================================================
// GST CALCULATION TESTS
// ============================================================================

describe('GST Calculator', () => {
  describe('GSTIN Validation', () => {
    it('should validate correct GSTIN', () => {
      const result = validateGSTIN('27AAPFU0939F1Z5');
      expect(result.valid).toBe(true);
      expect(result.stateCode).toBe('27');
      expect(result.stateName).toBe('Maharashtra');
    });

    it('should reject invalid GSTIN format', () => {
      const result = validateGSTIN('INVALID');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject empty GSTIN', () => {
      const result = validateGSTIN('');
      expect(result.valid).toBe(false);
    });
  });

  describe('Pure Agent GST', () => {
    it('should calculate GST only on service fee', () => {
      const result = calculatePureAgentGST(
        250000,  // Principal amount (airline ticket)
        7500,    // Service fee
        false    // Intrastate
      );

      expect(result.principalAmount).toBe(250000);
      expect(result.serviceFee).toBe(7500);
      expect(result.gstOnServiceFee).toBe(1350); // 18% of 7500
      expect(result.cgst).toBe(675);
      expect(result.sgst).toBe(675);
      expect(result.igst).toBe(0);
      expect(result.totalPayable).toBe(258850); // 250000 + 7500 + 1350
    });

    it('should apply IGST for interstate Pure Agent', () => {
      const result = calculatePureAgentGST(
        250000,
        7500,
        true  // Interstate
      );

      expect(result.cgst).toBe(0);
      expect(result.sgst).toBe(0);
      expect(result.igst).toBe(1350);
    });
  });
});

// ============================================================================
// SECTION 269ST CASH LIMIT TESTS
// ============================================================================

describe('Section 269ST Cash Limit Validator', () => {
  const createAdultTraveler = (name: string) => ({
    id: name,
    name,
    dateOfBirth: new Date(1990, 0, 1), // 35 years old
    age: 35,
    isAdult: true,
    nationality: 'Indian'
  });

  const createMinorTraveler = (name: string) => ({
    id: name,
    name,
    dateOfBirth: new Date(2015, 0, 1), // ~10 years old
    age: 10,
    isAdult: false,
    nationality: 'Indian'
  });

  describe('Cash Limit Calculation', () => {
    it('should allow 2L per adult', () => {
      const result = validateCashPayment({
        travelers: [
          createAdultTraveler('John'),
          createAdultTraveler('Jane')
        ],
        bookingAmount: 500000,
        cashAmount: 350000
      });

      expect(result.isCompliant).toBe(true);
      expect(result.maxCashAllowed).toBe(400000); // 2 adults × 2L
    });

    it('should flag violation when cash exceeds limit', () => {
      const result = validateCashPayment({
        travelers: [
          createAdultTraveler('John'),
          createAdultTraveler('Jane')
        ],
        bookingAmount: 600000,
        cashAmount: 500000
      });

      expect(result.isCompliant).toBe(false);
      expect(result.violationAmount).toBe(100000);
      expect(result.penaltyAmount).toBe(100000); // 100% penalty
    });

    it('should not count minors for cash limit', () => {
      const result = validateCashPayment({
        travelers: [
          createAdultTraveler('John'),
          createAdultTraveler('Jane'),
          createMinorTraveler('Kid')
        ],
        bookingAmount: 700000,
        cashAmount: 400000
      });

      expect(result.isCompliant).toBe(true);
      expect(result.maxCashAllowed).toBe(400000); // Only 2 adults
      expect(result.adultCount).toBe(2);
      expect(result.minorCount).toBe(1);
    });

    it('should not allow any cash when only minors', () => {
      const result = validateCashPayment({
        travelers: [
          createMinorTraveler('Kid1'),
          createMinorTraveler('Kid2')
        ],
        bookingAmount: 200000,
        cashAmount: 50000
      });

      expect(result.isCompliant).toBe(false);
      expect(result.maxCashAllowed).toBe(0);
      expect(result.messages.some(m => m.type === 'ERROR')).toBe(true);
    });
  });

  describe('Cash Payment Optimization', () => {
    it('should suggest optimal cash split', () => {
      const result = optimizeCashPayment(
        500000,  // Booking amount
        2,       // Adults
        1        // Minors
      );

      expect(result.maxCash).toBe(400000);
      expect(result.minimumOtherPayment).toBe(100000);
    });

    it('should require full non-cash when no adults', () => {
      const result = optimizeCashPayment(
        200000,
        0,   // No adults
        2    // Only minors
      );

      expect(result.maxCash).toBe(0);
      expect(result.minimumOtherPayment).toBe(200000);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Tax Integration', () => {
  it('should calculate all taxes for a complete booking', () => {
    // Simulate a complete international booking
    const packageValue = 500000;
    const previousCumulative = 0;

    // Calculate TCS
    const tcsResult = calculateTCS({
      packageValue,
      previousCumulative,
      isInternational: true,
      hasPan: true
    });

    expect(tcsResult.totalTcs).toBe(25000); // 5% of 5L

    // Calculate Pure Agent GST (if applicable)
    const gstResult = calculatePureAgentGST(
      450000,  // Principal
      50000,   // Service fee (10% markup)
      false    // Intrastate
    );

    expect(gstResult.gstOnServiceFee).toBe(9000); // 18% of 50000

    // Validate cash payment
    const cashResult = validateCashPayment({
      travelers: [
        {
          id: '1', name: 'Adult 1',
          dateOfBirth: new Date(1990, 0, 1),
          age: 35, isAdult: true, nationality: 'Indian'
        },
        {
          id: '2', name: 'Adult 2',
          dateOfBirth: new Date(1992, 0, 1),
          age: 33, isAdult: true, nationality: 'Indian'
        }
      ],
      bookingAmount: packageValue + tcsResult.totalTcs + gstResult.gstOnServiceFee,
      cashAmount: 400000
    });

    expect(cashResult.isCompliant).toBe(true);
    expect(cashResult.maxCashAllowed).toBe(400000);
  });
});
