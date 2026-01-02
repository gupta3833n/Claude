/**
 * TourCompliance Pro - Excel Exporter
 * =====================================
 *
 * Exports data to professional Excel files with formatting.
 *
 * Uses SheetJS (xlsx) for Excel generation.
 */

import * as XLSX from 'xlsx';
import { Document, Booking, Client, Payment } from '@/types';
import { format } from 'date-fns';

export interface ExcelExportOptions {
  sheetName?: string;
  includeHeaders?: boolean;
  dateFormat?: string;
  currencyFormat?: string;
}

/**
 * Export bookings to Excel
 */
export function exportBookingsToExcel(
  bookings: Booking[],
  options: ExcelExportOptions = {}
): void {
  const { sheetName = 'Bookings', dateFormat = 'dd-MMM-yyyy' } = options;

  const data = bookings.map(booking => ({
    'Booking No': booking.bookingNumber,
    'Date': format(new Date(booking.createdAt), dateFormat),
    'Destination': booking.destination,
    'Trip Type': booking.tripType,
    'Travelers': booking.adultCount + booking.childCount,
    'Adults': booking.adultCount,
    'Children': booking.childCount,
    'Subtotal': booking.subtotal,
    'GST': booking.gstDetails.totalGst,
    'TCS': booking.tcsDetails.totalTcs,
    'Grand Total': booking.grandTotal,
    'Payment Status': booking.paymentStatus,
    'Cash Received': booking.cashReceived,
    'Status': booking.status,
    'Departure': format(new Date(booking.departureDate), dateFormat),
    'Return': format(new Date(booking.returnDate), dateFormat)
  }));

  downloadExcel(data, sheetName, `Bookings_${format(new Date(), 'yyyyMMdd')}.xlsx`);
}

/**
 * Export TCS report to Excel
 */
export function exportTCSReportToExcel(
  bookings: Booking[],
  period: { startDate: Date; endDate: Date },
  options: ExcelExportOptions = {}
): void {
  const { dateFormat = 'dd-MMM-yyyy' } = options;

  // Filter bookings with TCS
  const tcsBookings = bookings.filter(b =>
    b.tcsDetails.applicable && b.tcsDetails.totalTcs > 0
  );

  const data = tcsBookings.map(booking => ({
    'Booking No': booking.bookingNumber,
    'Date': format(new Date(booking.createdAt), dateFormat),
    'Client': 'Client Name', // Would join with clients
    'PAN': 'PAN', // Would get from client
    'Destination': booking.destination,
    'Package Value': booking.grandTotal - booking.tcsDetails.totalTcs,
    'Previous Cumulative': booking.tcsDetails.previousCumulative,
    'New Cumulative': booking.tcsDetails.newCumulative,
    'Threshold': booking.tcsDetails.thresholdApplied,
    'Amount @ 5%': booking.tcsDetails.amountAt5Percent,
    'TCS @ 5%': booking.tcsDetails.tcsAt5Percent,
    'Amount @ 20%': booking.tcsDetails.amountAt20Percent,
    'TCS @ 20%': booking.tcsDetails.tcsAt20Percent,
    'Total TCS': booking.tcsDetails.totalTcs,
    'Effective Rate %': (booking.tcsDetails.effectiveRate * 100).toFixed(2)
  }));

  // Add summary row
  const totalTcs = tcsBookings.reduce((sum, b) => sum + b.tcsDetails.totalTcs, 0);
  data.push({
    'Booking No': 'TOTAL',
    'Date': '',
    'Client': '',
    'PAN': '',
    'Destination': '',
    'Package Value': tcsBookings.reduce((sum, b) => sum + (b.grandTotal - b.tcsDetails.totalTcs), 0),
    'Previous Cumulative': '',
    'New Cumulative': '',
    'Threshold': '',
    'Amount @ 5%': tcsBookings.reduce((sum, b) => sum + b.tcsDetails.amountAt5Percent, 0),
    'TCS @ 5%': tcsBookings.reduce((sum, b) => sum + b.tcsDetails.tcsAt5Percent, 0),
    'Amount @ 20%': tcsBookings.reduce((sum, b) => sum + b.tcsDetails.amountAt20Percent, 0),
    'TCS @ 20%': tcsBookings.reduce((sum, b) => sum + b.tcsDetails.tcsAt20Percent, 0),
    'Total TCS': totalTcs,
    'Effective Rate %': ''
  } as typeof data[0]);

  const filename = `TCS_Report_${format(period.startDate, 'yyyyMMdd')}_${format(period.endDate, 'yyyyMMdd')}.xlsx`;
  downloadExcel(data, 'TCS Report', filename);
}

/**
 * Export GST summary to Excel
 */
export function exportGSTSummaryToExcel(
  documents: Document[],
  period: { month: number; year: number },
  options: ExcelExportOptions = {}
): void {
  const { dateFormat = 'dd-MMM-yyyy' } = options;

  // Filter for period
  const periodDocs = documents.filter(doc => {
    const docDate = new Date(doc.documentDate);
    return docDate.getMonth() + 1 === period.month &&
           docDate.getFullYear() === period.year &&
           doc.status === 'FINAL';
  });

  // Detail sheet
  const detailData = periodDocs.map(doc => ({
    'Invoice No': doc.documentNumber,
    'Date': format(new Date(doc.documentDate), dateFormat),
    'Type': doc.type,
    'Client': 'Client Name', // Would join with clients
    'GSTIN': 'GSTIN', // Would get from client
    'Taxable Value': doc.gstDetails.taxableValue,
    'CGST': doc.gstDetails.cgstAmount,
    'SGST': doc.gstDetails.sgstAmount,
    'IGST': doc.gstDetails.igstAmount,
    'Total GST': doc.gstDetails.totalGst,
    'Grand Total': doc.grandTotal
  }));

  // Summary sheet
  const summaryData = [
    { 'Description': 'Total Taxable Value', 'Amount': periodDocs.reduce((sum, d) => sum + d.gstDetails.taxableValue, 0) },
    { 'Description': 'Total CGST', 'Amount': periodDocs.reduce((sum, d) => sum + d.gstDetails.cgstAmount, 0) },
    { 'Description': 'Total SGST', 'Amount': periodDocs.reduce((sum, d) => sum + d.gstDetails.sgstAmount, 0) },
    { 'Description': 'Total IGST', 'Amount': periodDocs.reduce((sum, d) => sum + d.gstDetails.igstAmount, 0) },
    { 'Description': 'Total GST', 'Amount': periodDocs.reduce((sum, d) => sum + d.gstDetails.totalGst, 0) },
    { 'Description': 'Total Invoices', 'Amount': periodDocs.length }
  ];

  const filename = `GST_Summary_${period.month.toString().padStart(2, '0')}${period.year}.xlsx`;

  // Create workbook with multiple sheets
  const wb = XLSX.utils.book_new();

  const ws1 = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

  const ws2 = XLSX.utils.json_to_sheet(detailData);
  XLSX.utils.book_append_sheet(wb, ws2, 'Detail');

  XLSX.writeFile(wb, filename);
}

/**
 * Export client ledger to Excel
 */
export function exportClientLedgerToExcel(
  client: Client,
  bookings: Booking[],
  payments: Payment[],
  options: ExcelExportOptions = {}
): void {
  const { dateFormat = 'dd-MMM-yyyy' } = options;

  // Build ledger entries
  const entries: {
    Date: string;
    Description: string;
    Debit: number | string;
    Credit: number | string;
    Balance: number;
  }[] = [];

  let balance = 0;

  // Sort all transactions by date
  const transactions = [
    ...bookings.map(b => ({
      date: new Date(b.createdAt),
      type: 'booking' as const,
      data: b
    })),
    ...payments.map(p => ({
      date: new Date(p.date),
      type: 'payment' as const,
      data: p
    }))
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  for (const txn of transactions) {
    if (txn.type === 'booking') {
      const booking = txn.data as Booking;
      balance += booking.grandTotal;
      entries.push({
        Date: format(txn.date, dateFormat),
        Description: `Booking: ${booking.bookingNumber} - ${booking.destination}`,
        Debit: booking.grandTotal,
        Credit: '',
        Balance: balance
      });
    } else {
      const payment = txn.data as Payment;
      balance -= payment.amount;
      entries.push({
        Date: format(txn.date, dateFormat),
        Description: `Payment: ${payment.mode} - ${payment.reference || 'N/A'}`,
        Debit: '',
        Credit: payment.amount,
        Balance: balance
      });
    }
  }

  // Add summary at end
  entries.push({
    Date: '',
    Description: 'CLOSING BALANCE',
    Debit: '',
    Credit: '',
    Balance: balance
  });

  const filename = `Client_Ledger_${client.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.xlsx`;
  downloadExcel(entries, 'Ledger', filename);
}

/**
 * Export Section 269ST cash report
 */
export function exportCashReportToExcel(
  bookings: Booking[],
  options: ExcelExportOptions = {}
): void {
  const { dateFormat = 'dd-MMM-yyyy' } = options;

  const cashBookings = bookings.filter(b => b.cashReceived > 0);

  const data = cashBookings.map(booking => ({
    'Booking No': booking.bookingNumber,
    'Date': format(new Date(booking.createdAt), dateFormat),
    'Client': 'Client Name',
    'Adults': booking.adultCount,
    'Minors': booking.childCount,
    'Max Cash Allowed': booking.cashLimitDetails.maxCashAllowed,
    'Cash Received': booking.cashReceived,
    'Is Compliant': booking.cashLimitDetails.isCompliant ? 'Yes' : 'NO - VIOLATION',
    'Violation Amount': booking.cashLimitDetails.violationAmount || 0,
    'Potential Penalty': booking.cashLimitDetails.penaltyAmount || 0,
    'Warning': booking.cashLimitDetails.warningMessage || ''
  }));

  // Add summary
  const violations = cashBookings.filter(b => !b.cashLimitDetails.isCompliant);
  data.push({
    'Booking No': 'SUMMARY',
    'Date': '',
    'Client': '',
    'Adults': '',
    'Minors': '',
    'Max Cash Allowed': '',
    'Cash Received': cashBookings.reduce((sum, b) => sum + b.cashReceived, 0),
    'Is Compliant': violations.length === 0 ? 'ALL COMPLIANT' : `${violations.length} VIOLATIONS`,
    'Violation Amount': violations.reduce((sum, b) => sum + (b.cashLimitDetails.violationAmount || 0), 0),
    'Potential Penalty': violations.reduce((sum, b) => sum + (b.cashLimitDetails.penaltyAmount || 0), 0),
    'Warning': ''
  } as typeof data[0]);

  const filename = `Section_269ST_Report_${format(new Date(), 'yyyyMMdd')}.xlsx`;
  downloadExcel(data, 'Cash Report', filename);
}

/**
 * Helper function to download Excel file
 */
function downloadExcel(data: Record<string, unknown>[], sheetName: string, filename: string): void {
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Auto-size columns
  const colWidths = Object.keys(data[0] || {}).map(key => ({
    wch: Math.max(
      key.length,
      ...data.map(row => String(row[key] || '').length)
    ) + 2
  }));
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  XLSX.writeFile(workbook, filename);
}

/**
 * Export to CSV (simpler format)
 */
export function exportToCSV(data: Record<string, unknown>[], filename: string): void {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
