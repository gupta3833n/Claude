/**
 * TourCompliance Pro - Tally XML Exporter
 * =========================================
 *
 * Exports transactions to Tally ERP 9 and Tally Prime XML format.
 *
 * Supports:
 * - Sales vouchers (invoices)
 * - Receipt vouchers (payments)
 * - Journal vouchers (adjustments)
 * - GST entries (CGST, SGST, IGST)
 * - TCS entries
 */

import { Document, Payment, Company } from '@/types';
import { format } from 'date-fns';

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
    sundryDebtors: string;
  };
}

interface TallyVoucher {
  date: Date;
  voucherType: string;
  voucherNumber: string;
  narration: string;
  ledgerEntries: {
    ledgerName: string;
    amount: number;
    isDr: boolean;
  }[];
}

/**
 * Generate Tally XML for a set of documents
 */
export function generateTallyXML(
  documents: Document[],
  payments: Payment[],
  config: TallyExportConfig
): string {
  const vouchers: TallyVoucher[] = [];

  // Convert documents to sales vouchers
  for (const doc of documents) {
    if (doc.type === 'INVOICE' && doc.status === 'FINAL') {
      vouchers.push(createSalesVoucher(doc, config));
    }
  }

  // Convert payments to receipt vouchers
  for (const payment of payments) {
    vouchers.push(createReceiptVoucher(payment, config));
  }

  // Generate XML
  return buildTallyXML(vouchers, config);
}

function createSalesVoucher(doc: Document, config: TallyExportConfig): TallyVoucher {
  const entries: TallyVoucher['ledgerEntries'] = [];
  const clientLedger = `${config.ledgerMappings.sundryDebtors}`; // Would use actual client name

  // Debit: Customer (total amount including taxes)
  entries.push({
    ledgerName: clientLedger,
    amount: doc.grandTotal,
    isDr: true
  });

  // Credit: Sales (taxable value)
  entries.push({
    ledgerName: config.ledgerMappings.sales,
    amount: doc.subtotal,
    isDr: false
  });

  // Credit: GST
  if (doc.gstDetails.cgstAmount > 0) {
    entries.push({
      ledgerName: config.ledgerMappings.cgst,
      amount: doc.gstDetails.cgstAmount,
      isDr: false
    });
  }
  if (doc.gstDetails.sgstAmount > 0) {
    entries.push({
      ledgerName: config.ledgerMappings.sgst,
      amount: doc.gstDetails.sgstAmount,
      isDr: false
    });
  }
  if (doc.gstDetails.igstAmount > 0) {
    entries.push({
      ledgerName: config.ledgerMappings.igst,
      amount: doc.gstDetails.igstAmount,
      isDr: false
    });
  }

  // Credit: TCS (if applicable)
  if (doc.tcsDetails.applicable && doc.tcsDetails.totalTcs > 0) {
    entries.push({
      ledgerName: config.ledgerMappings.tcs,
      amount: doc.tcsDetails.totalTcs,
      isDr: false
    });
  }

  return {
    date: new Date(doc.documentDate),
    voucherType: 'Sales',
    voucherNumber: doc.documentNumber,
    narration: `Being sales invoice ${doc.documentNumber}`,
    ledgerEntries: entries
  };
}

function createReceiptVoucher(payment: Payment, config: TallyExportConfig): TallyVoucher {
  const ledgerName = payment.isCash
    ? config.ledgerMappings.cash
    : config.ledgerMappings.bank;

  return {
    date: new Date(payment.date),
    voucherType: 'Receipt',
    voucherNumber: payment.reference || payment.id.slice(0, 8),
    narration: `Being receipt for booking ${payment.bookingId}`,
    ledgerEntries: [
      {
        ledgerName,
        amount: payment.amount,
        isDr: true
      },
      {
        ledgerName: config.ledgerMappings.sundryDebtors,
        amount: payment.amount,
        isDr: false
      }
    ]
  };
}

function buildTallyXML(vouchers: TallyVoucher[], config: TallyExportConfig): string {
  const formatAmount = (amount: number, isDr: boolean) => {
    return isDr ? amount.toFixed(2) : (-amount).toFixed(2);
  };

  const vouchersXML = vouchers.map(voucher => {
    const entriesXML = voucher.ledgerEntries.map(entry => `
      <ALLLEDGERENTRIES.LIST>
        <LEDGERNAME>${escapeXML(entry.ledgerName)}</LEDGERNAME>
        <ISDEEMEDPOSITIVE>${entry.isDr ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>
        <AMOUNT>${formatAmount(entry.amount, entry.isDr)}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>`
    ).join('');

    return `
    <VOUCHER VCHTYPE="${voucher.voucherType}" ACTION="Create">
      <DATE>${format(voucher.date, 'yyyyMMdd')}</DATE>
      <VOUCHERTYPENAME>${voucher.voucherType}</VOUCHERTYPENAME>
      <VOUCHERNUMBER>${escapeXML(voucher.voucherNumber)}</VOUCHERNUMBER>
      <NARRATION>${escapeXML(voucher.narration)}</NARRATION>
      ${entriesXML}
    </VOUCHER>`;
  }).join('\n');

  // Wrap based on version
  if (config.version === 'PRIME') {
    return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Import</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>Vouchers</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${escapeXML(config.companyName)}</SVCURRENTCOMPANY>
      </STATICVARIABLES>
    </DESC>
    <DATA>
      <TALLYMESSAGE xmlns:UDF="TallyUDF">
        ${vouchersXML}
      </TALLYMESSAGE>
    </DATA>
  </BODY>
</ENVELOPE>`;
  } else {
    // ERP 9 format
    return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escapeXML(config.companyName)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          ${vouchersXML}
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
  }
}

function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Download Tally XML file
 */
export function downloadTallyXML(
  documents: Document[],
  payments: Payment[],
  config: TallyExportConfig,
  filename = 'tally-export.xml'
): void {
  const xml = generateTallyXML(documents, payments, config);
  const blob = new Blob([xml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
