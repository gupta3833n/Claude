import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function BookingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/bookings')}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>
        <h1 className="text-2xl font-display font-bold text-slate-800 dark:text-white">
          Booking Details
        </h1>
      </div>
      <div className="card">
        <p className="text-slate-500 dark:text-slate-400">
          Booking ID: {id}
        </p>
        <p className="mt-4">
          This page will show complete booking details with payment tracking,
          invoice generation, and TCS calculation breakdown.
        </p>
      </div>
    </div>
  );
}
