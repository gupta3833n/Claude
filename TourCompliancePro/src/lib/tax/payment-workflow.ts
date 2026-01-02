/**
 * TourCompliance Pro - Payment & Cash Handling Module
 * =====================================================
 *
 * Handles real-world payment scenarios:
 * 1. Cash handling fee (5% when client pays cash but vendor needs bank transfer)
 * 2. Payment tracking (received from client vs paid to vendor)
 * 3. Proforma → Payment → Final Invoice workflow
 * 4. Compliance blocks for illegal requests
 */

import { Payment, PaymentMode, Booking, Traveler } from '@/types';
import { CASH_LIMIT_CONFIG, calculateMaxCashAllowed } from '@/config/tax-laws';

// ============================================================================
// CASH HANDLING FEE CONFIGURATION
// ============================================================================

export interface CashHandlingConfig {
  /** Fee percentage charged when client pays cash but vendor needs bank */
  feePercentage: number;

  /** Minimum fee amount */
  minimumFee: number;

  /** Maximum fee amount (cap) */
  maximumFee?: number;

  /** Fee display name for invoice */
  displayName: string;

  /** SAC code for cash handling service */
  sacCode: string;

  /** GST rate on cash handling fee */
  gstRate: number;
}

export const DEFAULT_CASH_HANDLING_CONFIG: CashHandlingConfig = {
  feePercentage: 5,           // 5% on cash amount
  minimumFee: 500,            // Min ₹500
  maximumFee: undefined,      // No cap by default
  displayName: 'Cash Processing Charges',
  sacCode: '997159',          // Other financial services
  gstRate: 0.18               // 18% GST on service
};

/**
 * Calculate cash handling fee
 */
export function calculateCashHandlingFee(
  cashAmount: number,
  config: CashHandlingConfig = DEFAULT_CASH_HANDLING_CONFIG
): {
  cashAmount: number;
  feePercentage: number;
  feeAmount: number;
  gstOnFee: number;
  totalFee: number;
  breakdown: string;
} {
  let feeAmount = cashAmount * (config.feePercentage / 100);

  // Apply minimum
  feeAmount = Math.max(feeAmount, config.minimumFee);

  // Apply maximum if set
  if (config.maximumFee) {
    feeAmount = Math.min(feeAmount, config.maximumFee);
  }

  const gstOnFee = feeAmount * config.gstRate;
  const totalFee = feeAmount + gstOnFee;

  const breakdown = `
Cash Processing Fee Calculation:
─────────────────────────────────
Cash Amount Received:        ₹${cashAmount.toLocaleString('en-IN')}
Fee @ ${config.feePercentage}%:                 ₹${feeAmount.toLocaleString('en-IN')}
GST on Fee @ 18%:            ₹${gstOnFee.toLocaleString('en-IN')}
─────────────────────────────────
Total Cash Processing Fee:   ₹${totalFee.toLocaleString('en-IN')}

Note: This fee covers the cost of converting cash to
bank payment for vendor settlement.
  `.trim();

  return {
    cashAmount,
    feePercentage: config.feePercentage,
    feeAmount,
    gstOnFee,
    totalFee,
    breakdown
  };
}

// ============================================================================
// PAYMENT TRACKING (RECEIVED VS SENT)
// ============================================================================

export interface PaymentFlow {
  bookingId: string;

  // Money received FROM client
  receivedFromClient: {
    cash: number;
    bank: number;
    upi: number;
    card: number;
    cheque: number;
    total: number;
    payments: Payment[];
  };

  // Money paid TO vendors
  paidToVendors: {
    airline: number;
    hotel: number;
    transport: number;
    visa: number;
    other: number;
    total: number;
    payments: VendorPayment[];
  };

  // Balance
  balance: {
    netReceived: number;      // From client
    netPaid: number;          // To vendors
    pendingFromClient: number;
    profitRealized: number;
  };
}

export interface VendorPayment {
  id: string;
  bookingId: string;
  vendorName: string;
  vendorType: 'AIRLINE' | 'HOTEL' | 'TRANSPORT' | 'VISA' | 'OTHER';
  amount: number;
  mode: PaymentMode;
  reference: string;
  date: Date;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  notes?: string;
}

/**
 * Calculate payment flow for a booking
 */
export function calculatePaymentFlow(
  booking: Booking,
  clientPayments: Payment[],
  vendorPayments: VendorPayment[]
): PaymentFlow {
  // Aggregate client payments by mode
  const receivedByMode = {
    cash: 0,
    bank: 0,
    upi: 0,
    card: 0,
    cheque: 0
  };

  for (const payment of clientPayments) {
    switch (payment.mode) {
      case PaymentMode.CASH:
        receivedByMode.cash += payment.amount;
        break;
      case PaymentMode.BANK_TRANSFER:
        receivedByMode.bank += payment.amount;
        break;
      case PaymentMode.UPI:
        receivedByMode.upi += payment.amount;
        break;
      case PaymentMode.CARD:
        receivedByMode.card += payment.amount;
        break;
      case PaymentMode.CHEQUE:
        receivedByMode.cheque += payment.amount;
        break;
    }
  }

  const totalReceived = Object.values(receivedByMode).reduce((a, b) => a + b, 0);

  // Aggregate vendor payments by type
  const paidByType = {
    airline: 0,
    hotel: 0,
    transport: 0,
    visa: 0,
    other: 0
  };

  for (const payment of vendorPayments) {
    if (payment.status === 'COMPLETED') {
      switch (payment.vendorType) {
        case 'AIRLINE':
          paidByType.airline += payment.amount;
          break;
        case 'HOTEL':
          paidByType.hotel += payment.amount;
          break;
        case 'TRANSPORT':
          paidByType.transport += payment.amount;
          break;
        case 'VISA':
          paidByType.visa += payment.amount;
          break;
        case 'OTHER':
          paidByType.other += payment.amount;
          break;
      }
    }
  }

  const totalPaid = Object.values(paidByType).reduce((a, b) => a + b, 0);

  // Calculate balances
  const pendingFromClient = booking.grandTotal - totalReceived;
  const profitRealized = totalReceived - totalPaid;

  return {
    bookingId: booking.id,
    receivedFromClient: {
      ...receivedByMode,
      total: totalReceived,
      payments: clientPayments
    },
    paidToVendors: {
      ...paidByType,
      total: totalPaid,
      payments: vendorPayments
    },
    balance: {
      netReceived: totalReceived,
      netPaid: totalPaid,
      pendingFromClient,
      profitRealized
    }
  };
}

// ============================================================================
// PROFORMA → PAYMENT → FINAL INVOICE WORKFLOW
// ============================================================================

export type InvoiceWorkflowStage =
  | 'QUOTATION'           // Initial quote
  | 'PROFORMA_SENT'       // Proforma invoice sent
  | 'PARTIAL_PAYMENT'     // Some payment received
  | 'FULL_PAYMENT'        // Full payment received
  | 'INVOICE_GENERATED'   // Final tax invoice issued
  | 'COMPLETED';          // All done

export interface InvoiceWorkflow {
  bookingId: string;
  stage: InvoiceWorkflowStage;
  quotationId?: string;
  proformaId?: string;
  invoiceId?: string;

  timeline: {
    quotationDate?: Date;
    proformaSentDate?: Date;
    firstPaymentDate?: Date;
    fullPaymentDate?: Date;
    invoiceDate?: Date;
  };

  amounts: {
    quotedAmount: number;
    proformaAmount: number;
    receivedAmount: number;
    invoicedAmount: number;
  };

  canGenerateInvoice: boolean;
  reason?: string;
}

/**
 * Determine current workflow stage and next actions
 */
export function getInvoiceWorkflowStatus(
  booking: Booking,
  payments: Payment[],
  documents: { type: string; id: string; date: Date }[]
): InvoiceWorkflow {
  const quotation = documents.find(d => d.type === 'QUOTATION');
  const proforma = documents.find(d => d.type === 'PROFORMA');
  const invoice = documents.find(d => d.type === 'INVOICE');

  const totalReceived = payments.reduce((sum, p) => sum + p.amount, 0);
  const isFullyPaid = totalReceived >= booking.grandTotal;

  let stage: InvoiceWorkflowStage;
  let canGenerateInvoice = false;
  let reason = '';

  if (invoice) {
    stage = 'COMPLETED';
    canGenerateInvoice = false;
    reason = 'Invoice already generated';
  } else if (isFullyPaid) {
    stage = 'FULL_PAYMENT';
    canGenerateInvoice = true;
    reason = 'Full payment received. Ready to generate invoice.';
  } else if (totalReceived > 0) {
    stage = 'PARTIAL_PAYMENT';
    canGenerateInvoice = true; // Can generate invoice for partial too
    reason = `Partial payment received. ₹${(booking.grandTotal - totalReceived).toLocaleString('en-IN')} pending.`;
  } else if (proforma) {
    stage = 'PROFORMA_SENT';
    canGenerateInvoice = false;
    reason = 'Waiting for payment. Proforma sent to client.';
  } else if (quotation) {
    stage = 'QUOTATION';
    canGenerateInvoice = false;
    reason = 'Quotation sent. Generate proforma to request payment.';
  } else {
    stage = 'QUOTATION';
    canGenerateInvoice = false;
    reason = 'Create quotation or proforma to start.';
  }

  return {
    bookingId: booking.id,
    stage,
    quotationId: quotation?.id,
    proformaId: proforma?.id,
    invoiceId: invoice?.id,
    timeline: {
      quotationDate: quotation?.date,
      proformaSentDate: proforma?.date,
      firstPaymentDate: payments[0]?.date,
      fullPaymentDate: isFullyPaid ? payments[payments.length - 1]?.date : undefined,
      invoiceDate: invoice?.date
    },
    amounts: {
      quotedAmount: booking.grandTotal,
      proformaAmount: booking.grandTotal,
      receivedAmount: totalReceived,
      invoicedAmount: invoice ? booking.grandTotal : 0
    },
    canGenerateInvoice,
    reason
  };
}

// ============================================================================
// COMPLIANCE BLOCKER - ILLEGAL REQUEST DETECTION
// ============================================================================

export interface ComplianceCheck {
  isCompliant: boolean;
  blockers: ComplianceBlocker[];
  warnings: ComplianceWarning[];
  suggestions: string[];
}

export interface ComplianceBlocker {
  code: string;
  severity: 'BLOCK';
  title: string;
  description: string;
  legalReference: string;
  penalty: string;
}

export interface ComplianceWarning {
  code: string;
  severity: 'WARNING';
  title: string;
  description: string;
  recommendation: string;
}

/**
 * Check if a booking request is legal and compliant
 * BLOCKS illegal requests (no invoice, no TCS, excess cash, etc.)
 */
export function checkBookingCompliance(input: {
  packageValue: number;
  isInternational: boolean;
  travelers: Traveler[];
  cashAmount: number;
  wantsNoInvoice: boolean;
  wantsNoTcs: boolean;
  invoiceInThirdPartyName: boolean;
}): ComplianceCheck {
  const blockers: ComplianceBlocker[] = [];
  const warnings: ComplianceWarning[] = [];
  const suggestions: string[] = [];

  const {
    packageValue,
    isInternational,
    travelers,
    cashAmount,
    wantsNoInvoice,
    wantsNoTcs,
    invoiceInThirdPartyName
  } = input;

  // Count adults and calculate cash limit
  const adults = travelers.filter(t => t.isAdult);
  const maxCash = adults.length * CASH_LIMIT_CONFIG.limitPerPerson;

  // ─────────────────────────────────────────────────────────────────────────
  // BLOCK 1: No Invoice Request
  // ─────────────────────────────────────────────────────────────────────────
  if (wantsNoInvoice) {
    blockers.push({
      code: 'NO_INVOICE',
      severity: 'BLOCK',
      title: 'Invoice is Mandatory',
      description: 'GST law requires a tax invoice to be issued for all taxable supplies. Operating without invoice is a criminal offense.',
      legalReference: 'Section 31 of CGST Act, 2017',
      penalty: '₹10,000 or 10% of tax due, whichever is higher, per invoice'
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BLOCK 2: No TCS Request (International)
  // ─────────────────────────────────────────────────────────────────────────
  if (wantsNoTcs && isInternational && packageValue > 700000) {
    blockers.push({
      code: 'TCS_MANDATORY',
      severity: 'BLOCK',
      title: 'TCS is Mandatory for International Packages',
      description: `TCS must be collected on overseas tour packages exceeding threshold. Current threshold: ₹7L (FY 2024-25). Package value: ₹${packageValue.toLocaleString('en-IN')}.`,
      legalReference: 'Section 206C(1G) of Income Tax Act',
      penalty: 'Interest @ 1% per month + penalty equal to TCS amount'
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BLOCK 3: Cash Exceeds Section 269ST Limit
  // ─────────────────────────────────────────────────────────────────────────
  if (cashAmount > maxCash) {
    blockers.push({
      code: 'CASH_LIMIT_EXCEEDED',
      severity: 'BLOCK',
      title: 'Cash Payment Exceeds Legal Limit',
      description: `Maximum cash allowed: ₹${maxCash.toLocaleString('en-IN')} (${adults.length} adults × ₹2L). Requested: ₹${cashAmount.toLocaleString('en-IN')}. Excess: ₹${(cashAmount - maxCash).toLocaleString('en-IN')}.`,
      legalReference: 'Section 269ST of Income Tax Act',
      penalty: `100% of excess amount = ₹${(cashAmount - maxCash).toLocaleString('en-IN')}`
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BLOCK 4: Invoice in Third Party Name
  // ─────────────────────────────────────────────────────────────────────────
  if (invoiceInThirdPartyName) {
    blockers.push({
      code: 'THIRD_PARTY_INVOICE',
      severity: 'BLOCK',
      title: 'Invoice Must Be in Traveler\'s Name',
      description: 'Invoice must be issued in the name of the person availing the service (traveler). Issuing in third party name is benami transaction.',
      legalReference: 'Section 31 CGST Act + Benami Transactions Act',
      penalty: 'Confiscation of property + prosecution'
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BLOCK 5: No Adults (Minors Only)
  // ─────────────────────────────────────────────────────────────────────────
  if (adults.length === 0 && travelers.length > 0 && cashAmount > 0) {
    blockers.push({
      code: 'MINORS_CANNOT_PAY',
      severity: 'BLOCK',
      title: 'Minors Cannot Make Cash Payments',
      description: 'Contracts with minors are void ab initio. At least one adult (18+) must be present to make cash payments.',
      legalReference: 'Indian Contract Act, 1872 - Section 11',
      penalty: 'Transaction voidable, no legal recourse'
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // WARNING 1: Large Cash Transaction
  // ─────────────────────────────────────────────────────────────────────────
  if (cashAmount > 50000 && cashAmount <= maxCash) {
    warnings.push({
      code: 'LARGE_CASH',
      severity: 'WARNING',
      title: 'Large Cash Transaction',
      description: `Cash payment of ₹${cashAmount.toLocaleString('en-IN')} will be reported to Income Tax department if total exceeds ₹10L in a year.`,
      recommendation: 'Collect PAN from client. Consider bank transfer for amounts > ₹50,000.'
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // WARNING 2: High Value Transaction
  // ─────────────────────────────────────────────────────────────────────────
  if (packageValue > 500000) {
    warnings.push({
      code: 'HIGH_VALUE',
      severity: 'WARNING',
      title: 'High Value Transaction',
      description: `Transaction value ₹${packageValue.toLocaleString('en-IN')} may trigger reporting requirements.`,
      recommendation: 'Ensure client provides PAN. Keep all documentation ready.'
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SUGGESTIONS
  // ─────────────────────────────────────────────────────────────────────────
  if (blockers.length > 0) {
    suggestions.push('This request cannot be processed as-is. Here are legal alternatives:');

    if (blockers.some(b => b.code === 'CASH_LIMIT_EXCEEDED')) {
      suggestions.push(`• Maximum cash: ₹${maxCash.toLocaleString('en-IN')}. Remaining ₹${Math.max(0, cashAmount - maxCash).toLocaleString('en-IN')} must be via bank/UPI/card.`);
    }

    if (blockers.some(b => b.code === 'TCS_MANDATORY')) {
      const tcsAmount = packageValue * 0.05;
      suggestions.push(`• TCS @ 5%: ₹${tcsAmount.toLocaleString('en-IN')} will be collected and deposited with IT department. Client can claim credit in their ITR.`);
    }

    if (blockers.some(b => b.code === 'NO_INVOICE')) {
      suggestions.push('• Invoice is mandatory but client details are kept confidential with you. Only shared with tax authorities if investigated.');
    }

    suggestions.push('• If client insists on avoiding these requirements, you must REFUSE the booking. You bear the legal risk, not them.');
  }

  return {
    isCompliant: blockers.length === 0,
    blockers,
    warnings,
    suggestions
  };
}

/**
 * Format compliance check result for display
 */
export function formatComplianceCheckResult(result: ComplianceCheck): string {
  const lines: string[] = [];

  if (result.isCompliant) {
    lines.push('✅ COMPLIANCE CHECK PASSED');
    lines.push('─'.repeat(40));
  } else {
    lines.push('❌ COMPLIANCE CHECK FAILED - CANNOT PROCEED');
    lines.push('═'.repeat(40));
  }

  if (result.blockers.length > 0) {
    lines.push('\n🚫 BLOCKERS (Must Fix):');
    for (const blocker of result.blockers) {
      lines.push(`\n  ${blocker.title}`);
      lines.push(`  ${blocker.description}`);
      lines.push(`  Legal Ref: ${blocker.legalReference}`);
      lines.push(`  Penalty: ${blocker.penalty}`);
    }
  }

  if (result.warnings.length > 0) {
    lines.push('\n⚠️ WARNINGS:');
    for (const warning of result.warnings) {
      lines.push(`\n  ${warning.title}`);
      lines.push(`  ${warning.description}`);
      lines.push(`  Recommendation: ${warning.recommendation}`);
    }
  }

  if (result.suggestions.length > 0) {
    lines.push('\n💡 SUGGESTIONS:');
    for (const suggestion of result.suggestions) {
      lines.push(`  ${suggestion}`);
    }
  }

  return lines.join('\n');
}
