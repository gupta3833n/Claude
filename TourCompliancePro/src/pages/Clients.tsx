import { useState } from 'react';
import { Search, Plus, Users, MoreVertical } from 'lucide-react';

export default function Clients() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-800 dark:text-white">
            Clients
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage your clients and track their booking history
          </p>
        </div>
        <button className="btn btn-primary self-start sm:self-auto">
          <Plus className="w-5 h-5" />
          Add Client
        </button>
      </div>

      {/* Search */}
      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search clients by name, phone, or GSTIN..."
            className="input pl-10"
          />
        </div>
      </div>

      {/* Empty state */}
      <div className="card text-center py-12">
        <Users className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
        <h3 className="text-lg font-display font-semibold text-slate-800 dark:text-white mb-2">
          No clients yet
        </h3>
        <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
          Add your first client to start creating bookings. Client data includes
          PAN for TCS tracking and GSTIN for GST compliance.
        </p>
        <button className="btn btn-primary">
          <Plus className="w-5 h-5" />
          Add First Client
        </button>
      </div>
    </div>
  );
}
