import { useState } from 'react';
import { TrendingUp, Lock, Eye, EyeOff, IndianRupee, Percent, BarChart3 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function ProfitDashboard() {
  const { canViewProfits, verifyPin } = useAuth();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [showValues, setShowValues] = useState(true);

  const handleUnlock = async () => {
    if (pin.length !== 4) {
      setPinError('Please enter a 4-digit PIN');
      return;
    }

    const valid = await verifyPin(pin);
    if (valid) {
      setIsUnlocked(true);
      setPinError('');
    } else {
      setPinError('Invalid PIN. Please try again.');
      setPin('');
    }
  };

  const maskValue = (value: string) => showValues ? value : '••••••';

  if (!canViewProfits) {
    return (
      <div className="card text-center py-12">
        <Lock className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
        <h2 className="text-xl font-display font-bold text-slate-800 dark:text-white mb-2">
          Access Denied
        </h2>
        <p className="text-slate-500 dark:text-slate-400">
          You don't have permission to view the profit dashboard.
          Contact your administrator for access.
        </p>
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <div className="card text-center">
          <div className="w-16 h-16 bg-primary-100 dark:bg-primary-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
          <h2 className="text-xl font-display font-bold text-slate-800 dark:text-white mb-2">
            Profit Dashboard Locked
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            Enter your 4-digit PIN to access the profit dashboard.
            This information is sensitive and protected.
          </p>

          <div className="flex justify-center gap-2 mb-4">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center text-2xl font-mono ${
                  pin.length > i
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/20'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                {pin.length > i ? '•' : ''}
              </div>
            ))}
          </div>

          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, '').slice(0, 4));
              setPinError('');
            }}
            className="sr-only"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
          />

          <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto mb-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'].map((num, i) => (
              <button
                key={i}
                onClick={() => {
                  if (num === 'del') {
                    setPin(prev => prev.slice(0, -1));
                  } else if (num !== null && pin.length < 4) {
                    setPin(prev => prev + num);
                  }
                }}
                disabled={num === null}
                className={`h-12 rounded-lg text-lg font-medium transition-colors ${
                  num === null
                    ? 'invisible'
                    : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300'
                }`}
              >
                {num === 'del' ? '⌫' : num}
              </button>
            ))}
          </div>

          {pinError && (
            <p className="text-sm text-danger-600 dark:text-danger-400 mb-4">
              {pinError}
            </p>
          )}

          <button
            onClick={handleUnlock}
            disabled={pin.length !== 4}
            className="btn btn-primary w-full"
          >
            Unlock Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-800 dark:text-white">
            Profit Dashboard
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Protected financial overview - for owner/manager eyes only
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowValues(!showValues)}
            className="btn btn-secondary"
          >
            {showValues ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showValues ? 'Hide Values' : 'Show Values'}
          </button>
          <button
            onClick={() => setIsUnlocked(false)}
            className="btn btn-ghost"
          >
            <Lock className="w-4 h-4" />
            Lock
          </button>
        </div>
      </div>

      {/* Profit stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card bg-gradient-to-br from-success-500 to-success-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-success-100 text-sm">Total Revenue (Month)</p>
              <p className="text-2xl font-display font-bold mt-1">
                {maskValue('₹24,50,000')}
              </p>
            </div>
            <IndianRupee className="w-10 h-10 text-success-200" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-primary-500 to-primary-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-100 text-sm">Total Cost (Month)</p>
              <p className="text-2xl font-display font-bold mt-1">
                {maskValue('₹18,75,000')}
              </p>
            </div>
            <BarChart3 className="w-10 h-10 text-primary-200" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-accent-500 to-accent-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-accent-100 text-sm">Gross Profit (Month)</p>
              <p className="text-2xl font-display font-bold mt-1">
                {maskValue('₹5,75,000')}
              </p>
            </div>
            <TrendingUp className="w-10 h-10 text-accent-200" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-warning-500 to-warning-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-warning-100 text-sm">Profit Margin</p>
              <p className="text-2xl font-display font-bold mt-1">
                {maskValue('23.5%')}
              </p>
            </div>
            <Percent className="w-10 h-10 text-warning-200" />
          </div>
        </div>
      </div>

      {/* Profit by component */}
      <div className="card">
        <h3 className="text-lg font-display font-semibold text-slate-800 dark:text-white mb-4">
          Profit by Service Type
        </h3>
        <div className="space-y-4">
          {[
            { name: 'International Packages', revenue: '₹18,50,000', cost: '₹14,00,000', profit: '₹4,50,000', margin: '24.3%' },
            { name: 'Domestic Packages', revenue: '₹4,20,000', cost: '₹3,50,000', profit: '₹70,000', margin: '16.7%' },
            { name: 'Flight Bookings (Pure Agent)', revenue: '₹1,50,000', cost: '₹1,05,000', profit: '₹45,000', margin: '30.0%' },
            { name: 'Visa Services', revenue: '₹30,000', cost: '₹20,000', profit: '₹10,000', margin: '33.3%' }
          ].map((item) => (
            <div
              key={item.name}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg gap-4"
            >
              <div>
                <p className="font-medium text-slate-800 dark:text-white">{item.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Revenue: {maskValue(item.revenue)} | Cost: {maskValue(item.cost)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display font-bold text-success-600 dark:text-success-400">
                  {maskValue(item.profit)}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Margin: {maskValue(item.margin)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Note */}
      <div className="card bg-warning-50 dark:bg-warning-500/10 border border-warning-200 dark:border-warning-500/30">
        <p className="text-sm text-warning-700 dark:text-warning-300">
          <strong>Note:</strong> This data is for demonstration. Actual profits will be calculated
          from your bookings. All values are protected and hidden from customer-facing screens
          as per your nomenclature configuration.
        </p>
      </div>
    </div>
  );
}
