import { useState } from 'react';
import { Search, Filter, Download, FileText, Plus } from 'lucide-react';

export default function Invoices() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-800 dark:text-white">
            Invoices
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Generate and manage tax invoices, proforma, debit & credit notes
          </p>
        </div>
      </div>

      {/* Document type tabs */}
      <div className="card">
        <div className="flex flex-wrap gap-2">
          {['All', 'Tax Invoice', 'Proforma', 'Debit Note', 'Credit Note'].map(type => (
            <button
              key={type}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                type === 'All'
                  ? 'bg-primary-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      <div className="card text-center py-12">
        <FileText className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
        <h3 className="text-lg font-display font-semibold text-slate-800 dark:text-white mb-2">
          No invoices yet
        </h3>
        <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
          Invoices are automatically generated from bookings. Create a booking first,
          then generate professional GST-compliant invoices.
        </p>
      </div>
    </div>
  );
}
