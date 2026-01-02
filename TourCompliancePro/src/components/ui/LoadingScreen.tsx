import { Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 dark:from-slate-900 dark:to-slate-800">
      <div className="text-center">
        {/* Logo */}
        <div className="mb-8">
          <div className="w-16 h-16 mx-auto bg-primary-500 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-2xl font-bold text-white font-display">TC</span>
          </div>
        </div>

        {/* Spinner */}
        <Loader2 className="w-8 h-8 mx-auto text-primary-500 animate-spin" />

        {/* Message */}
        <p className="mt-4 text-slate-600 dark:text-slate-400 text-sm">
          {message}
        </p>

        {/* App name */}
        <h1 className="mt-6 text-xl font-display font-bold text-slate-800 dark:text-white">
          TourCompliance Pro
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
          Tax Compliance for Tour Operators
        </p>
      </div>
    </div>
  );
}
