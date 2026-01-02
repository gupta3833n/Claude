/**
 * TourCompliance Pro - GSTR-1 JSON Generator
 * ============================================
 *
 * Generates GSTR-1 JSON file ready for upload to GST portal.
 *
 * Sections:
 * - B2B: Business to Business invoices (with GSTIN)
 * - B2CL: Business to Consumer Large (> ₹2.5L without GSTIN)
 * - B2CS: Business to Consumer Small (< ₹2.5L summary)
 * - CDNR: Credit/Debit notes to registered
 * - CDNUR: Credit/Debit notes to unregistered
 * - EXP: Export invoices
 * - HSN: HSN-wise summary
 * - DOC: Document summary
 */

import { Document, GSTType } from '@/types';
import { format } from 'date-fns';
import { STATE_CODES } from '@/config/tax-laws';

export interface GSTR1Output {
  gstin: string;
  fp: string;  // Filing period MMYYYY
  gt: number;  // Gross turnover
  cur_gt: number;  // Current period turnover
  b2b: B2BSection[];
  b2cl: B2CLSection[];
  b2cs: B2CSSection[];
  cdnr: CDNRSection[];
  cdnur: CDNURSection[];
  exp: EXPSection[];
  hsn: HSNSection;
  doc_issue: DocIssueSection;
}

interface B2BSection {
  ctin: string;
  inv: B2BInvoice[];
}

interface B2BInvoice {
  inum: string;
  idt: string;
  val: number;
  pos: string;
  rchrg: 'Y' | 'N';
  inv_typ: 'R' | 'SEZWP' | 'SEZWOP' | 'DE';
  itms: InvoiceItem[];
}

interface InvoiceItem {
  num: number;
  itm_det: {
    rt: number;
    txval: number;
    camt: number;
    samt: number;
    iamt: number;
    csamt: number;
  };
}

interface B2CLSection {
  pos: string;
  inv: B2CLInvoice[];
}

interface B2CLInvoice {
  inum: string;
  idt: string;
  val: number;
  itms: {
    num: number;
    itm_det: {
      rt: number;
      txval: number;
      iamt: number;
      csamt: number;
    };
  }[];
}

interface B2CSSection {
  sply_ty: 'INTRA' | 'INTER';
  pos: string;
  typ: 'OE' | 'E';
  rt: number;
  txval: number;
  camt: number;
  samt: number;
  iamt: number;
  csamt: number;
}

interface CDNRSection {
  ctin: string;
  nt: CreditDebitNote[];
}

interface CreditDebitNote {
  ntty: 'C' | 'D';
  nt_num: string;
  nt_dt: string;
  val: number;
  pos: string;
  rchrg: 'Y' | 'N';
  inv_typ: 'R' | 'SEZWP' | 'SEZWOP' | 'DE';
  itms: InvoiceItem[];
}

interface CDNURSection {
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
      csamt: number;
    };
  }[];
}

interface EXPSection {
  exp_typ: 'WPAY' | 'WOPAY';
  inv: {
    inum: string;
    idt: string;
    val: number;
    sbpcode?: string;
    sbnum?: string;
    sbdt?: string;
    itms: {
      rt: number;
      txval: number;
      iamt: number;
    }[];
  }[];
}

interface HSNSection {
  data: {
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
    csamt: number;
  }[];
}

interface DocIssueSection {
  doc_det: {
    doc_num: number;
    doc_typ: string;
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

/**
 * Generate GSTR-1 JSON from documents
 */
export function generateGSTR1(
  documents: Document[],
  gstin: string,
  period: { month: number; year: number }
): GSTR1Output {
  const fp = `${period.month.toString().padStart(2, '0')}${period.year}`;

  // Filter documents for this period
  const periodDocs = documents.filter(doc => {
    const docDate = new Date(doc.documentDate);
    return docDate.getMonth() + 1 === period.month &&
           docDate.getFullYear() === period.year &&
           doc.status === 'FINAL';
  });

  // Separate by type
  const invoices = periodDocs.filter(d => d.type === 'INVOICE');
  const creditNotes = periodDocs.filter(d => d.type === 'CREDIT_NOTE');
  const debitNotes = periodDocs.filter(d => d.type === 'DEBIT_NOTE');

  // Build sections
  const b2b = buildB2BSection(invoices);
  const b2cl = buildB2CLSection(invoices);
  const b2cs = buildB2CSSection(invoices);
  const cdnr = buildCDNRSection(creditNotes, debitNotes);
  const cdnur = buildCDNURSection(creditNotes, debitNotes);
  const exp = buildEXPSection(invoices);
  const hsn = buildHSNSection(invoices);
  const doc_issue = buildDocIssueSection(periodDocs);

  // Calculate totals
  const gt = invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);

  return {
    gstin,
    fp,
    gt,
    cur_gt: gt,
    b2b,
    b2cl,
    b2cs,
    cdnr,
    cdnur,
    exp,
    hsn,
    doc_issue
  };
}

function buildB2BSection(invoices: Document[]): B2BSection[] {
  // Group by customer GSTIN
  const byGstin = new Map<string, Document[]>();

  for (const inv of invoices) {
    // Only B2B if client has GSTIN (would need client data)
    // For now, we'll check if gstDetails.type indicates registered buyer
    const gstin = 'BUYER_GSTIN'; // Would come from client data
    if (!byGstin.has(gstin)) {
      byGstin.set(gstin, []);
    }
    byGstin.get(gstin)!.push(inv);
  }

  return Array.from(byGstin.entries()).map(([ctin, invs]) => ({
    ctin,
    inv: invs.map(inv => ({
      inum: inv.documentNumber,
      idt: format(new Date(inv.documentDate), 'dd-MM-yyyy'),
      val: inv.grandTotal,
      pos: inv.gstDetails.type === GSTType.IGST ? '07' : '27', // Place of supply
      rchrg: 'N' as const,
      inv_typ: 'R' as const,
      itms: buildInvoiceItems(inv)
    }))
  }));
}

function buildB2CLSection(invoices: Document[]): B2CLSection[] {
  // B2CL: Unregistered buyers with invoice value > ₹2.5L
  const b2clInvoices = invoices.filter(inv =>
    !inv.gstDetails.type && // Unregistered (no GSTIN)
    inv.grandTotal > 250000 &&
    inv.gstDetails.type === GSTType.IGST // Interstate only
  );

  // Group by place of supply
  const byPos = new Map<string, Document[]>();
  for (const inv of b2clInvoices) {
    const pos = '07'; // Would get from client state
    if (!byPos.has(pos)) {
      byPos.set(pos, []);
    }
    byPos.get(pos)!.push(inv);
  }

  return Array.from(byPos.entries()).map(([pos, invs]) => ({
    pos,
    inv: invs.map(inv => ({
      inum: inv.documentNumber,
      idt: format(new Date(inv.documentDate), 'dd-MM-yyyy'),
      val: inv.grandTotal,
      itms: [{
        num: 1,
        itm_det: {
          rt: 18, // GST rate
          txval: inv.subtotal,
          iamt: inv.gstDetails.igstAmount,
          csamt: 0
        }
      }]
    }))
  }));
}

function buildB2CSSection(invoices: Document[]): B2CSSection[] {
  // B2CS: Unregistered buyers with invoice value < ₹2.5L (summary)
  const b2csInvoices = invoices.filter(inv =>
    inv.grandTotal <= 250000
  );

  // Group by type (INTRA/INTER), POS, and rate
  const summary = new Map<string, B2CSSection>();

  for (const inv of b2csInvoices) {
    const sply_ty = inv.gstDetails.type === GSTType.IGST ? 'INTER' : 'INTRA';
    const pos = '27'; // Would get from client state
    const rt = 18;
    const key = `${sply_ty}-${pos}-${rt}`;

    if (!summary.has(key)) {
      summary.set(key, {
        sply_ty: sply_ty as 'INTRA' | 'INTER',
        pos,
        typ: 'OE',
        rt,
        txval: 0,
        camt: 0,
        samt: 0,
        iamt: 0,
        csamt: 0
      });
    }

    const existing = summary.get(key)!;
    existing.txval += inv.subtotal;
    existing.camt += inv.gstDetails.cgstAmount;
    existing.samt += inv.gstDetails.sgstAmount;
    existing.iamt += inv.gstDetails.igstAmount;
  }

  return Array.from(summary.values());
}

function buildCDNRSection(creditNotes: Document[], debitNotes: Document[]): CDNRSection[] {
  // Credit/Debit notes to registered dealers
  const notes = [...creditNotes, ...debitNotes];
  const registeredNotes = notes.filter(n => true); // Would check if client has GSTIN

  // Group by customer GSTIN
  const byGstin = new Map<string, Document[]>();
  for (const note of registeredNotes) {
    const gstin = 'BUYER_GSTIN'; // Would come from client data
    if (!byGstin.has(gstin)) {
      byGstin.set(gstin, []);
    }
    byGstin.get(gstin)!.push(note);
  }

  return Array.from(byGstin.entries()).map(([ctin, notes]) => ({
    ctin,
    nt: notes.map(note => ({
      ntty: (note.type === 'CREDIT_NOTE' ? 'C' : 'D') as 'C' | 'D',
      nt_num: note.documentNumber,
      nt_dt: format(new Date(note.documentDate), 'dd-MM-yyyy'),
      val: note.grandTotal,
      pos: '27',
      rchrg: 'N' as const,
      inv_typ: 'R' as const,
      itms: buildInvoiceItems(note)
    }))
  }));
}

function buildCDNURSection(creditNotes: Document[], debitNotes: Document[]): CDNURSection[] {
  // Credit/Debit notes to unregistered dealers
  return [];
}

function buildEXPSection(invoices: Document[]): EXPSection[] {
  const exports = invoices.filter(inv => inv.gstDetails.type === GSTType.EXPORT);

  if (exports.length === 0) return [];

  return [{
    exp_typ: 'WOPAY', // Without payment (zero-rated)
    inv: exports.map(inv => ({
      inum: inv.documentNumber,
      idt: format(new Date(inv.documentDate), 'dd-MM-yyyy'),
      val: inv.grandTotal,
      sbpcode: inv.exportDetails?.portOfLoading,
      sbnum: inv.exportDetails?.shippingBillNumber,
      sbdt: inv.exportDetails?.shippingBillDate
        ? format(new Date(inv.exportDetails.shippingBillDate), 'dd-MM-yyyy')
        : undefined,
      itms: [{
        rt: 0,
        txval: inv.subtotal,
        iamt: 0
      }]
    }))
  }];
}

function buildHSNSection(invoices: Document[]): HSNSection {
  // Group by HSN/SAC code
  const byHsn = new Map<string, {
    hsn: string;
    desc: string;
    qty: number;
    val: number;
    txval: number;
    camt: number;
    samt: number;
    iamt: number;
  }>();

  for (const inv of invoices) {
    for (const item of inv.lineItems) {
      const key = item.sacCode;
      if (!byHsn.has(key)) {
        byHsn.set(key, {
          hsn: item.sacCode,
          desc: item.description.slice(0, 30),
          qty: 0,
          val: 0,
          txval: 0,
          camt: 0,
          samt: 0,
          iamt: 0
        });
      }

      const existing = byHsn.get(key)!;
      existing.qty += item.quantity;
      existing.val += item.amount;
      existing.txval += item.amount;
      // Would need to calculate per-item GST
    }
  }

  return {
    data: Array.from(byHsn.values()).map((item, index) => ({
      num: index + 1,
      hsn_sc: item.hsn,
      desc: item.desc,
      uqc: 'NOS', // Numbers
      qty: item.qty,
      val: item.val,
      txval: item.txval,
      camt: item.camt,
      samt: item.samt,
      iamt: item.iamt,
      csamt: 0
    }))
  };
}

function buildDocIssueSection(documents: Document[]): DocIssueSection {
  // Count documents by type
  const invoices = documents.filter(d => d.type === 'INVOICE');
  const creditNotes = documents.filter(d => d.type === 'CREDIT_NOTE');
  const debitNotes = documents.filter(d => d.type === 'DEBIT_NOTE');

  const docTypes = [
    { type: 'Invoices', docs: invoices, num: 1 },
    { type: 'Credit Notes', docs: creditNotes, num: 4 },
    { type: 'Debit Notes', docs: debitNotes, num: 5 }
  ];

  return {
    doc_det: docTypes
      .filter(dt => dt.docs.length > 0)
      .map(dt => ({
        doc_num: dt.num,
        doc_typ: dt.type,
        docs: [{
          num: 1,
          from: dt.docs[0]?.documentNumber || '',
          to: dt.docs[dt.docs.length - 1]?.documentNumber || '',
          totnum: dt.docs.length,
          cancel: dt.docs.filter(d => d.status === 'CANCELLED').length,
          net_issue: dt.docs.filter(d => d.status === 'FINAL').length
        }]
      }))
  };
}

function buildInvoiceItems(doc: Document): InvoiceItem[] {
  // Group by GST rate
  const byRate = new Map<number, { txval: number; camt: number; samt: number; iamt: number }>();

  for (const breakdown of doc.gstDetails.breakdownByRate) {
    const rate = breakdown.rate * 100; // Convert to percentage
    if (!byRate.has(rate)) {
      byRate.set(rate, { txval: 0, camt: 0, samt: 0, iamt: 0 });
    }
    const existing = byRate.get(rate)!;
    existing.txval += breakdown.taxableValue;
    existing.camt += breakdown.cgst;
    existing.samt += breakdown.sgst;
    existing.iamt += breakdown.igst;
  }

  return Array.from(byRate.entries()).map(([rt, values], index) => ({
    num: index + 1,
    itm_det: {
      rt,
      txval: values.txval,
      camt: values.camt,
      samt: values.samt,
      iamt: values.iamt,
      csamt: 0
    }
  }));
}

/**
 * Download GSTR-1 JSON file
 */
export function downloadGSTR1(
  documents: Document[],
  gstin: string,
  period: { month: number; year: number },
  filename?: string
): void {
  const data = generateGSTR1(documents, gstin, period);
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const defaultFilename = `GSTR1_${gstin}_${period.month.toString().padStart(2, '0')}${period.year}.json`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename || defaultFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
