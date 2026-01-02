import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, Download, Calendar, MoreVertical } from 'lucide-react';

export default function Bookings() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-800 dark:text-white">
            Bookings
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage all your tour bookings
          </p>
        </div>
        <Link to="/bookings/new" className="btn btn-primary self-start sm:self-auto">
          <Plus className="w-5 h-5" />
          New Booking
        </Link>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search bookings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>
          <button className="btn btn-secondary">
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button className="btn btn-secondary">
            <Calendar className="w-4 h-4" />
            Date Range
          </button>
          <button className="btn btn-secondary">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Empty state */}
      <div className="card text-center py-12">
        <Calendar className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
        <h3 className="text-lg font-display font-semibold text-slate-800 dark:text-white mb-2">
          No bookings yet
        </h3>
        <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
          Create your first booking to start managing your tour operations with automatic
          TCS calculation, GST compliance, and Section 269ST cash limit validation.
        </p>
        <Link to="/bookings/new" className="btn btn-primary">
          <Plus className="w-5 h-5" />
          Create First Booking
        </Link>
      </div>
    </div>
  );
}
