/**
 * TourCompliance Pro - Tax Module
 * ================================
 *
 * Central export for all tax-related calculations
 */

// TCS Calculator (Section 206C(1G))
export {
  calculateTCS,
  getCustomerCumulativeForFY,
  runTCSTests,
  TCS_TEST_CASES,
  type TCSCalculationInput,
  type TCSCalculationResult
} from './tcs-calculator';

// GST Calculator
export {
  calculateGST,
  calculatePureAgentGST,
  validateGSTIN,
  getSACCode,
  GST_TEST_CASES,
  type GSTCalculationInput,
  type GSTCalculationResult
} from './gst-calculator';

// Section 269ST Cash Limit Validator
export {
  validateCashPayment,
  optimizeCashPayment,
  generateCashReceiptDetails,
  isAdult,
  CASH_LIMIT_TEST_CASES,
  type CashValidationInput,
  type CashValidationResult
} from './cash-limit-validator';

// Tax Configuration
export {
  getTCSConfig,
  getCurrentFinancialYear,
  getFinancialYearForDate,
  GST_CONFIG,
  SAC_CODES,
  STATE_CODES,
  getStateFromGSTIN,
  isInterstate,
  CASH_LIMIT_CONFIG,
  calculateMaxCashAllowed,
  PURE_AGENT_CONFIG,
  NOMENCLATURE,
  TAX_LAWS_VERSION
} from '@/config/tax-laws';

// Re-export types
export type {
  TCSDetails,
  GSTDetails,
  CashLimitDetails,
  TCSExemptionReason,
  GSTType,
  SupplyType
} from '@/types';
