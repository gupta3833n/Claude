import { BarChart3, Download, FileText, FileSpreadsheet, Database } from 'lucide-react';

const reports = [
  {
    title: 'TCS Report',
    description: 'Section 206C(1G) TCS collected, customer-wise breakdown for Form 27EQ',
    icon: FileText,
    formats: ['PDF', 'Excel']
  },
  {
    title: 'GST Summary',
    description: 'CGST, SGST, IGST summary by month for GSTR-1 filing',
    icon: FileText,
    formats: ['JSON', 'Excel']
  },
  {
    title: 'Cash Transactions',
    description: 'Section 269ST compliance report - cash receipts by customer',
    icon: FileText,
    formats: ['PDF', 'Excel']
  },
  {
    title: 'Tally Export',
    description: 'Export all transactions to Tally ERP 9 / Tally Prime format',
    icon: Database,
    formats: ['XML']
  },
  {
    title: 'Booking Summary',
    description: 'All bookings with revenue, costs, and status',
    icon: FileSpreadsheet,
    formats: ['Excel', 'CSV']
  },
  {
    title: 'Client Ledger',
    description: 'Customer-wise outstanding and payment history',
    icon: FileSpreadsheet,
    formats: ['PDF', 'Excel']
  }
];

export default function Reports() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-800 dark:text-white">
            Reports
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Generate compliance reports and export data
          </p>
        </div>
      </div>

      {/* Report categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <div key={report.title} className="card card-hover cursor-pointer">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-500/20">
                  <Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display font-semibold text-slate-800 dark:text-white">
                    {report.title}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {report.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {report.formats.map(format => (
                      <span
                        key={format}
                        className="px-2 py-0.5 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded"
                      >
                        {format}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* GSTR-1 Generator */}
      <div className="card border-2 border-dashed border-primary-200 dark:border-primary-500/30">
        <div className="flex items-center gap-4">
          <div className="p-4 rounded-xl bg-primary-100 dark:bg-primary-500/30">
            <FileText className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-display font-semibold text-slate-800 dark:text-white">
              GSTR-1 JSON Generator
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Generate GSTR-1 JSON file ready for upload to GST portal.
              Includes B2B, B2C, Credit/Debit notes, Exports, and HSN summary.
            </p>
          </div>
          <button className="btn btn-primary">
            <Download className="w-4 h-4" />
            Generate
          </button>
        </div>
      </div>
    </div>
  );
}
