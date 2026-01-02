/**
 * TourCompliance Pro - Smart Pricing Engine
 * ===========================================
 *
 * Implements 3 pricing calculation options:
 * 1. Forward Calculation: Cost → Add Markup → Final Price
 * 2. Backward Calculation: Target Price → Calculate Required Markup
 * 3. Margin-Based: Cost + Desired Margin % → Price
 *
 * All calculations respect tax rules and nomenclature.
 */

import { calculateGST, type GSTCalculationInput } from './gst-calculator';
import { calculateTCS, type TCSCalculationInput } from './tcs-calculator';
import { validateCashPayment, optimizeCashPayment } from './cash-limit-validator';
import { NOMENCLATURE, GST_CONFIG } from '@/config/tax-laws';
import {
  LineItem,
  SupplyType,
  GSTType,
  Traveler,
  TCSExemptionReason
} from '@/types';

export interface PricingComponent {
  id: string;
  name: string;
  costPrice: number;          // What you pay to supplier
  sellingPrice?: number;      // What you charge customer (for backward calc)
  quantity: number;
  isPureAgent: boolean;
  supplierName?: string;
  supplierGstin?: string;
  sacCode: string;
  gstRate: number;
}

export interface PricingInput {
  /** Booking components */
  components: PricingComponent[];

  /** Calculation mode */
  mode: 'FORWARD' | 'BACKWARD' | 'MARGIN';

  /** For FORWARD: markup percentage or amount */
  markup?: {
    type: 'PERCENTAGE' | 'AMOUNT';
    value: number;
  };

  /** For MARGIN: desired profit margin % */
  desiredMargin?: number;

  /** For BACKWARD: target final price */
  targetPrice?: number;

  /** Supply type */
  supplyType: SupplyType;

  /** GST details */
  sellerGstin: string;
  buyerGstin?: string;
  buyerStateCode: string;
  isExport: boolean;
  isSEZ: boolean;

  /** TCS details */
  isInternational: boolean;
  customerPan?: string;
  previousCumulative: number;

  /** Travelers for cash limit */
  travelers: Traveler[];
}

export interface PricingResult {
  /** Cost breakdown */
  totalCost: number;              // Sum of all cost prices
  totalMarkup: number;            // Total markup/profit
  markupPercentage: number;       // Effective markup %

  /** Component details with pricing */
  components: (PricingComponent & {
    markup: number;
    serviceFee: number;
    lineItem: LineItem;
  })[];

  /** Tax summary */
  subtotal: number;               // Before taxes
  gstDetails: ReturnType<typeof calculateGST>;
  tcsDetails: ReturnType<typeof calculateTCS>;

  /** Final amounts */
  grandTotal: number;
  amountInWords: string;

  /** Cash limit info */
  cashLimitInfo: {
    maxCash: number;
    adultCount: number;
    minorCount: number;
    recommendedPaymentSplit: {
      cash: number;
      nonCash: number;
    };
  };

  /** For display */
  displayBreakdown: {
    label: string;
    amount: number;
    isHighlighted?: boolean;
  }[];
}

/**
 * Calculate complete pricing for a booking
 */
export function calculatePricing(input: PricingInput): PricingResult {
  const {
    components,
    mode,
    markup,
    desiredMargin,
    targetPrice,
    supplyType,
    sellerGstin,
    buyerGstin,
    buyerStateCode,
    isExport,
    isSEZ,
    isInternational,
    customerPan,
    previousCumulative,
    travelers
  } = input;

  // Step 1: Calculate costs and markups based on mode
  let processedComponents: (PricingComponent & {
    markup: number;
    serviceFee: number;
    sellingPrice: number;
  })[];

  const totalCost = components.reduce((sum, c) => sum + (c.costPrice * c.quantity), 0);

  switch (mode) {
    case 'FORWARD':
      processedComponents = calculateForward(components, markup!);
      break;
    case 'BACKWARD':
      processedComponents = calculateBackward(components, targetPrice!, totalCost);
      break;
    case 'MARGIN':
      processedComponents = calculateWithMargin(components, desiredMargin!);
      break;
    default:
      throw new Error(`Unknown pricing mode: ${mode}`);
  }

  // Step 2: Create line items for GST calculation
  const lineItems: LineItem[] = processedComponents.map((comp, index) => {
    const displayName = comp.isPureAgent
      ? getDisplayName('airlineBookingFee', comp.name)
      : getDisplayName('markup', comp.name);

    return {
      id: comp.id || `item-${index}`,
      description: comp.name,
      sacCode: comp.sacCode,
      quantity: comp.quantity,
      unitPrice: comp.sellingPrice,
      amount: comp.sellingPrice * comp.quantity,
      isPureAgent: comp.isPureAgent,
      supplierName: comp.supplierName,
      supplierGstin: comp.supplierGstin,
      serviceFee: comp.serviceFee,
      serviceFeeGst: 0, // Will be calculated
      gstRate: comp.gstRate,
      gstAmount: 0, // Will be calculated
      displayName
    };
  });

  // Step 3: Calculate GST
  const gstInput: GSTCalculationInput = {
    lineItems,
    sellerGstin,
    buyerGstin,
    buyerStateCode,
    supplyType,
    isExport,
    isSEZ,
    placeOfSupplyCode: buyerStateCode
  };

  const gstDetails = calculateGST(gstInput);

  // Step 4: Calculate subtotal (after GST)
  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const subtotalWithGst = subtotal + gstDetails.totalGst;

  // Step 5: Calculate TCS
  const tcsInput: TCSCalculationInput = {
    packageValue: subtotalWithGst,
    previousCumulative,
    isInternational,
    hasPan: !!customerPan,
    exemptionReason: supplyType === SupplyType.PURE_AGENT
      ? TCSExemptionReason.PURE_AGENT
      : TCSExemptionReason.NONE
  };

  const tcsDetails = calculateTCS(tcsInput);

  // Step 6: Calculate grand total
  const grandTotal = subtotalWithGst + tcsDetails.totalTcs;

  // Step 7: Calculate total markup
  const totalMarkup = processedComponents.reduce((sum, c) => sum + c.markup * c.quantity, 0);
  const markupPercentage = totalCost > 0 ? (totalMarkup / totalCost) * 100 : 0;

  // Step 8: Calculate cash limits
  const adultCount = travelers.filter(t => t.isAdult).length;
  const minorCount = travelers.filter(t => !t.isAdult).length;
  const cashOptimization = optimizeCashPayment(grandTotal, adultCount, minorCount);

  // Step 9: Create display breakdown
  const displayBreakdown = createDisplayBreakdown(
    processedComponents,
    gstDetails,
    tcsDetails,
    grandTotal
  );

  // Step 10: Convert to words
  const amountInWords = numberToWords(Math.round(grandTotal));

  return {
    totalCost,
    totalMarkup,
    markupPercentage,
    components: processedComponents.map((comp, i) => ({
      ...comp,
      lineItem: gstDetails.lineItemsWithGst[i]
    })),
    subtotal,
    gstDetails,
    tcsDetails,
    grandTotal,
    amountInWords,
    cashLimitInfo: {
      maxCash: cashOptimization.maxCash,
      adultCount,
      minorCount,
      recommendedPaymentSplit: {
        cash: cashOptimization.paymentBreakdown.cash,
        nonCash: cashOptimization.paymentBreakdown.other
      }
    },
    displayBreakdown
  };
}

/**
 * Forward calculation: Cost + Markup = Price
 */
function calculateForward(
  components: PricingComponent[],
  markupConfig: { type: 'PERCENTAGE' | 'AMOUNT'; value: number }
): (PricingComponent & { markup: number; serviceFee: number; sellingPrice: number })[] {
  return components.map(comp => {
    let markup: number;

    if (markupConfig.type === 'PERCENTAGE') {
      markup = comp.costPrice * (markupConfig.value / 100);
    } else {
      // Distribute amount markup proportionally
      const totalCost = components.reduce((sum, c) => sum + c.costPrice, 0);
      const proportion = comp.costPrice / totalCost;
      markup = markupConfig.value * proportion;
    }

    const sellingPrice = comp.costPrice + markup;
    const serviceFee = comp.isPureAgent ? markup : 0;

    return {
      ...comp,
      markup,
      serviceFee,
      sellingPrice
    };
  });
}

/**
 * Backward calculation: Target Price - Taxes = Required Markup
 */
function calculateBackward(
  components: PricingComponent[],
  targetPrice: number,
  totalCost: number
): (PricingComponent & { markup: number; serviceFee: number; sellingPrice: number })[] {
  // Estimate GST to work backward
  const estimatedGst = targetPrice * (GST_CONFIG.standardRate / (1 + GST_CONFIG.standardRate));
  const preTaxTarget = targetPrice - estimatedGst;

  // Total markup available
  const totalMarkup = preTaxTarget - totalCost;

  // Distribute markup proportionally
  return components.map(comp => {
    const proportion = comp.costPrice / totalCost;
    const markup = totalMarkup * proportion;
    const sellingPrice = comp.costPrice + markup;
    const serviceFee = comp.isPureAgent ? markup : 0;

    return {
      ...comp,
      markup,
      serviceFee,
      sellingPrice
    };
  });
}

/**
 * Margin-based calculation: Cost / (1 - Margin%) = Price
 */
function calculateWithMargin(
  components: PricingComponent[],
  desiredMargin: number
): (PricingComponent & { markup: number; serviceFee: number; sellingPrice: number })[] {
  // Margin = (Price - Cost) / Price × 100
  // Price = Cost / (1 - Margin/100)
  const marginFactor = 1 - (desiredMargin / 100);

  return components.map(comp => {
    const sellingPrice = comp.costPrice / marginFactor;
    const markup = sellingPrice - comp.costPrice;
    const serviceFee = comp.isPureAgent ? markup : 0;

    return {
      ...comp,
      markup,
      serviceFee,
      sellingPrice
    };
  });
}

/**
 * Get customer-facing display name
 */
function getDisplayName(type: keyof typeof NOMENCLATURE, originalName: string): string {
  const prefix = NOMENCLATURE[type] || 'Service Charges';
  return `${prefix} - ${originalName}`;
}

/**
 * Create display breakdown for invoices
 */
function createDisplayBreakdown(
  components: { name: string; sellingPrice: number; quantity: number; markup: number }[],
  gstDetails: ReturnType<typeof calculateGST>,
  tcsDetails: ReturnType<typeof calculateTCS>,
  grandTotal: number
): { label: string; amount: number; isHighlighted?: boolean }[] {
  const breakdown: { label: string; amount: number; isHighlighted?: boolean }[] = [];

  // Add components
  for (const comp of components) {
    breakdown.push({
      label: comp.name,
      amount: comp.sellingPrice * comp.quantity
    });
  }

  // Add GST
  if (gstDetails.type === GSTType.CGST_SGST) {
    breakdown.push({ label: 'CGST', amount: gstDetails.cgstAmount });
    breakdown.push({ label: 'SGST', amount: gstDetails.sgstAmount });
  } else if (gstDetails.type === GSTType.IGST) {
    breakdown.push({ label: 'IGST', amount: gstDetails.igstAmount });
  }

  // Add TCS if applicable
  if (tcsDetails.applicable && tcsDetails.totalTcs > 0) {
    breakdown.push({
      label: `TCS u/s 206C(1G) @ ${(tcsDetails.effectiveRate * 100).toFixed(1)}%`,
      amount: tcsDetails.totalTcs
    });
  }

  // Add total
  breakdown.push({
    label: 'Grand Total',
    amount: grandTotal,
    isHighlighted: true
  });

  return breakdown;
}

/**
 * Convert number to words (Indian system)
 */
function numberToWords(num: number): string {
  if (num === 0) return 'Zero Rupees Only';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertLessThanThousand(n: number): string {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertLessThanThousand(n % 100) : '');
  }

  function convert(n: number): string {
    if (n === 0) return '';

    let result = '';

    // Crores (10,000,000)
    if (n >= 10000000) {
      result += convertLessThanThousand(Math.floor(n / 10000000)) + ' Crore ';
      n %= 10000000;
    }

    // Lakhs (100,000)
    if (n >= 100000) {
      result += convertLessThanThousand(Math.floor(n / 100000)) + ' Lakh ';
      n %= 100000;
    }

    // Thousands
    if (n >= 1000) {
      result += convertLessThanThousand(Math.floor(n / 1000)) + ' Thousand ';
      n %= 1000;
    }

    // Hundreds
    result += convertLessThanThousand(n);

    return result.trim();
  }

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);

  let words = 'Rupees ' + convert(rupees);
  if (paise > 0) {
    words += ' and ' + convert(paise) + ' Paise';
  }
  words += ' Only';

  return words;
}

// Export for use
export { numberToWords };
