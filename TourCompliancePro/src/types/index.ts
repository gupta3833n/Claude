/**
 * TourCompliance Pro - Type Definitions
 * =====================================
 * Core types for the entire application
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum DocumentType {
  INVOICE = 'INVOICE',
  PROFORMA = 'PROFORMA',
  DEBIT_NOTE = 'DEBIT_NOTE',
  CREDIT_NOTE = 'CREDIT_NOTE',
  QUOTATION = 'QUOTATION',
  RECEIPT = 'RECEIPT'
}

export enum PaymentMode {
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  UPI = 'UPI',
  CHEQUE = 'CHEQUE',
  CARD = 'CARD',
  MIXED = 'MIXED'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED'
}

export enum GSTType {
  CGST_SGST = 'CGST_SGST',      // Intrastate (same state)
  IGST = 'IGST',                  // Interstate (different states)
  EXPORT = 'EXPORT',              // Zero-rated export
  SEZ = 'SEZ',                    // Special Economic Zone
  EXEMPT = 'EXEMPT'               // Exempt supplies
}

export enum SupplyType {
  DIRECT = 'DIRECT',              // Tour operator supplies directly
  PURE_AGENT = 'PURE_AGENT',      // Acting as pure agent
  COMMISSION = 'COMMISSION'       // Commission agent
}

export enum UserRole {
  OWNER = 'OWNER',                // Tour operator who purchased the app
  MANAGER = 'MANAGER',            // Can view profits, approve invoices
  ACCOUNTANT = 'ACCOUNTANT',      // Can create invoices, manage payments
  STAFF = 'STAFF',                // Can create bookings, limited access
  VIEWER = 'VIEWER'               // Read-only access
}

export enum TCSExemptionReason {
  NONE = 'NONE',
  PURE_AGENT = 'PURE_AGENT',
  COMMISSION_AGENT = 'COMMISSION_AGENT',
  DOMESTIC_PACKAGE = 'DOMESTIC_PACKAGE',
  GOVERNMENT_ENTITY = 'GOVERNMENT_ENTITY'
}

// ============================================================================
// CORE BUSINESS TYPES
// ============================================================================

export interface Company {
  id: string;
  name: string;
  tradeName?: string;
  gstin: string;
  pan: string;
  address: Address;
  email: string;
  phone: string;
  logo?: string;
  bankDetails: BankDetails;
  signatory: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  stateCode: string;  // For GSTIN validation
  pincode: string;
  country: string;
}

export interface BankDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  ifscCode: string;
  branch?: string;
  upiId?: string;
}

export interface Client {
  id: string;
  companyId: string;
  name: string;
  gstin?: string;                 // Optional - can be unregistered
  pan?: string;
  address: Address;
  email?: string;
  phone: string;
  type: 'INDIVIDUAL' | 'BUSINESS' | 'GOVERNMENT';
  isRegistered: boolean;          // GST registered or not
  createdAt: Date;
  updatedAt: Date;
}

export interface Traveler {
  id: string;
  name: string;
  dateOfBirth: Date;
  age: number;                    // Calculated from DOB
  isAdult: boolean;               // 18+ years
  passportNumber?: string;
  nationality: string;
  phone?: string;
  email?: string;
}

// ============================================================================
// BOOKING & INVOICE TYPES
// ============================================================================

export interface Booking {
  id: string;
  companyId: string;
  clientId: string;
  bookingNumber: string;

  // Trip Details
  destination: string;
  tripType: 'DOMESTIC' | 'INTERNATIONAL';
  departureDate: Date;
  returnDate: Date;

  // Travelers
  travelers: Traveler[];
  adultCount: number;
  childCount: number;
  infantCount: number;

  // Financial
  supplyType: SupplyType;
  lineItems: LineItem[];

  // Calculated totals (stored for audit trail)
  subtotal: number;
  gstDetails: GSTDetails;
  tcsDetails: TCSDetails;
  grandTotal: number;

  // Payments
  payments: Payment[];
  paymentStatus: PaymentStatus;
  cashReceived: number;

  // Section 269ST Compliance
  cashLimitDetails: CashLimitDetails;

  // Status
  status: 'DRAFT' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  notes?: string;

  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LineItem {
  id: string;
  description: string;
  sacCode: string;                // Service Accounting Code
  quantity: number;
  unitPrice: number;
  amount: number;

  // For Pure Agent items
  isPureAgent: boolean;
  supplierName?: string;
  supplierGstin?: string;

  // Service fee (if Pure Agent)
  serviceFee: number;
  serviceFeeGst: number;

  // GST on this item
  gstRate: number;
  gstAmount: number;

  // Nomenclature (customer-facing name)
  displayName: string;            // e.g., "Airline Facilitation Charges" instead of "Markup"
}

export interface GSTDetails {
  type: GSTType;
  taxableValue: number;

  // For CGST + SGST (Intrastate)
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;

  // For IGST (Interstate)
  igstRate: number;
  igstAmount: number;

  // Total
  totalGst: number;

  // Breakdown by rate
  breakdownByRate: {
    rate: number;
    taxableValue: number;
    cgst: number;
    sgst: number;
    igst: number;
    total: number;
  }[];
}

export interface TCSDetails {
  applicable: boolean;
  exemptionReason?: TCSExemptionReason;

  // Customer's cumulative booking this FY
  previousCumulative: number;
  currentBookingValue: number;
  newCumulative: number;

  // Slab calculation
  thresholdApplied: number;       // ₹7L or ₹10L based on FY
  amountAt5Percent: number;
  tcsAt5Percent: number;
  amountAt20Percent: number;
  tcsAt20Percent: number;

  // Total
  totalTcs: number;

  // For display
  effectiveRate: number;          // Weighted average rate
}

export interface CashLimitDetails {
  maxCashAllowed: number;         // Adults × ₹2,00,000
  adultCount: number;
  minorCount: number;
  cashReceived: number;
  isCompliant: boolean;
  warningMessage?: string;
  violationAmount?: number;
  penaltyAmount?: number;         // 100% of violation
}

export interface Payment {
  id: string;
  bookingId: string;
  date: Date;
  amount: number;
  mode: PaymentMode;
  reference?: string;             // Cheque no, UTR, UPI ref

  // For cash payments
  isCash: boolean;
  cashPayerName?: string;         // Must be adult traveler
  cashPayerRelation?: string;

  notes?: string;
  createdBy: string;
  createdAt: Date;
}

// ============================================================================
// DOCUMENT TYPES (Invoice, Proforma, etc.)
// ============================================================================

export interface Document {
  id: string;
  companyId: string;
  bookingId?: string;
  clientId: string;

  type: DocumentType;
  documentNumber: string;
  documentDate: Date;

  // Original document reference (for Credit/Debit notes)
  originalDocumentId?: string;
  originalDocumentNumber?: string;

  // Financial Summary
  lineItems: LineItem[];
  subtotal: number;
  gstDetails: GSTDetails;
  tcsDetails: TCSDetails;
  grandTotal: number;
  amountInWords: string;

  // Terms & Notes
  termsAndConditions?: string;
  notes?: string;

  // For exports
  exportDetails?: ExportDetails;

  status: 'DRAFT' | 'FINAL' | 'CANCELLED';
  cancelReason?: string;

  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExportDetails {
  portOfLoading: string;
  portOfDischarge: string;
  countryOfDestination: string;
  currencyCode: string;
  exchangeRate: number;
  foreignCurrencyAmount: number;
  shippingBillNumber?: string;
  shippingBillDate?: Date;
}

// ============================================================================
// NUMBERING CONFIGURATION
// ============================================================================

export interface NumberingConfig {
  documentType: DocumentType;
  prefix: string;                 // e.g., "INV", "PRO", "DN", "CN"
  suffix?: string;
  separator: string;              // e.g., "-", "/"
  includeYear: boolean;
  yearFormat: 'YYYY' | 'YY' | 'FY';  // 2025, 25, or 2024-25
  startNumber: number;
  currentNumber: number;
  paddingDigits: number;          // e.g., 4 for 0001

  // Example: INV-2024-25/0001
}

// ============================================================================
// USER & ROLE TYPES
// ============================================================================

export interface User {
  id: string;
  companyId: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  permissions: Permission[];
  pin?: string;                   // Hashed 4-digit PIN for sensitive ops
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  resource: string;               // e.g., 'invoices', 'reports', 'settings'
  actions: ('create' | 'read' | 'update' | 'delete')[];
}

// ============================================================================
// AUDIT LOG
// ============================================================================

export interface AuditLog {
  id: string;
  companyId: string;
  userId: string;
  userName: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' | 'EXPORT' | 'LOGIN' | 'LOGOUT';
  resource: string;               // e.g., 'booking', 'invoice', 'payment'
  resourceId: string;
  changes?: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

// ============================================================================
// LICENSE & SUBSCRIPTION
// ============================================================================

export interface License {
  id: string;
  companyId: string;
  licenseKey: string;
  type: 'TRIAL' | 'BASIC' | 'PRO' | 'ENTERPRISE';
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';

  // Purchase details
  purchaseDate: Date;
  expiryDate?: Date;              // null for lifetime

  // Features
  maxUsers: number;
  maxInvoicesPerMonth: number;
  cloudSyncEnabled: boolean;
  exportEnabled: boolean;
  multiStateEnabled: boolean;

  // Subscription (optional)
  subscription?: {
    planId: string;
    billingCycle: 'MONTHLY' | 'YEARLY';
    nextBillingDate: Date;
    autoRenew: boolean;
  };

  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// THEME & CUSTOMIZATION
// ============================================================================

export interface ThemeConfig {
  id: string;
  companyId: string;
  name: string;

  colors: {
    primary: ColorShades;
    accent: ColorShades;
    success: ColorShades;
    warning: ColorShades;
    danger: ColorShades;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
  };

  darkMode: {
    enabled: boolean;
    colors?: ThemeConfig['colors'];
  };

  logo?: string;
  favicon?: string;
}

export interface ColorShades {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}

// ============================================================================
// SYNC TYPES
// ============================================================================

export interface SyncStatus {
  lastSyncAt?: Date;
  pendingChanges: number;
  syncInProgress: boolean;
  error?: string;
}

export interface SyncableEntity {
  id: string;
  _syncStatus: 'SYNCED' | 'PENDING' | 'CONFLICT';
  _localVersion: number;
  _serverVersion?: number;
  _lastModified: Date;
  _deletedAt?: Date;
}

// ============================================================================
// EXPORT TYPES
// ============================================================================

export interface TallyExportConfig {
  version: 'ERP9' | 'PRIME';
  companyName: string;
  ledgerMappings: {
    sales: string;
    cgst: string;
    sgst: string;
    igst: string;
    tcs: string;
    cash: string;
    bank: string;
  };
}

export interface GSTR1Data {
  gstin: string;
  period: string;              // MMYYYY format
  b2b: B2BInvoice[];
  b2cl: B2CLInvoice[];
  b2cs: B2CSSummary[];
  cdnr: CreditDebitNote[];
  cdnur: CreditDebitNoteUnregistered[];
  exp: ExportInvoice[];
  hsn: HSNSummary[];
  docs: DocumentSummary[];
}

export interface B2BInvoice {
  ctin: string;
  inv: {
    inum: string;
    idt: string;
    val: number;
    pos: string;
    rchrg: 'Y' | 'N';
    inv_typ: 'R' | 'SEZWP' | 'SEZWOP' | 'DE';
    itms: {
      num: number;
      itm_det: {
        rt: number;
        txval: number;
        camt: number;
        samt: number;
        iamt: number;
      };
    }[];
  }[];
}

export interface B2CLInvoice {
  pos: string;
  inv: {
    inum: string;
    idt: string;
    val: number;
    itms: {
      num: number;
      itm_det: {
        rt: number;
        txval: number;
        iamt: number;
      };
    }[];
  }[];
}

export interface B2CSSummary {
  sply_ty: 'INTRA' | 'INTER';
  pos: string;
  rt: number;
  typ: 'OE' | 'E';
  txval: number;
  camt: number;
  samt: number;
  iamt: number;
}

export interface CreditDebitNote {
  ctin: string;
  nt: {
    ntty: 'C' | 'D';
    nt_num: string;
    nt_dt: string;
    val: number;
    pos: string;
    rchrg: 'Y' | 'N';
    inv_typ: 'R' | 'SEZWP' | 'SEZWOP' | 'DE';
    itms: {
      num: number;
      itm_det: {
        rt: number;
        txval: number;
        camt: number;
        samt: number;
        iamt: number;
      };
    }[];
  }[];
}

export interface CreditDebitNoteUnregistered {
  typ: 'B2CL';
  ntty: 'C' | 'D';
  nt_num: string;
  nt_dt: string;
  val: number;
  pos: string;
  itms: {
    num: number;
    itm_det: {
      rt: number;
      txval: number;
      iamt: number;
    };
  }[];
}

export interface ExportInvoice {
  exp_typ: 'WPAY' | 'WOPAY';
  inv: {
    inum: string;
    idt: string;
    val: number;
    sbpcode: string;
    sbnum: string;
    sbdt: string;
    itms: {
      rt: number;
      txval: number;
      iamt: number;
    }[];
  }[];
}

export interface HSNSummary {
  num: number;
  hsn_sc: string;
  desc: string;
  uqc: string;
  qty: number;
  val: number;
  txval: number;
  camt: number;
  samt: number;
  iamt: number;
}

export interface DocumentSummary {
  doc_det: {
    doc_typ: number;
    docs: {
      num: number;
      from: string;
      to: string;
      totnum: number;
      cancel: number;
      net_issue: number;
    }[];
  }[];
}
