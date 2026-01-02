import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Users,
  FileText,
  CalendarDays,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/db/database';
import { getCurrentFinancialYear } from '@/config/tax-laws';

interface DashboardStats {
  todayBookings: number;
  todayRevenue: number;
  monthlyRevenue: number;
  monthlyTcs: number;
  pendingPayments: number;
  totalClients: number;
  recentBookings: Array<{
    id: string;
    clientName: string;
    destination: string;
    amount: number;
    status: string;
    date: Date;
  }>;
}

export default function Dashboard() {
  const { company, canViewProfits } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fy = getCurrentFinancialYear();

  useEffect(() => {
    loadDashboardStats();
  }, [company]);

  async function loadDashboardStats() {
    if (!company) {
      setIsLoading(false);
      return;
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      // Get bookings
      const bookings = await db.bookings
        .where('companyId')
        .equals(company.id)
        .filter(b => !b._deletedAt)
        .toArray();

      // Calculate stats
      const todayBookings = bookings.filter(b =>
        new Date(b.createdAt) >= today
      );

      const monthBookings = bookings.filter(b =>
        new Date(b.createdAt) >= monthStart
      );

      const pendingPayments = bookings.filter(b =>
        b.paymentStatus === 'PENDING' || b.paymentStatus === 'PARTIAL'
      );

      // Get clients count
      const clients = await db.clients
        .where('companyId')
        .equals(company.id)
        .filter(c => !c._deletedAt)
        .count();

      // Recent bookings
      const recentBookings = bookings
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map(b => ({
          id: b.id,
          clientName: 'Loading...', // Would need to join with clients
          destination: b.destination,
          amount: b.grandTotal,
          status: b.paymentStatus,
          date: new Date(b.createdAt)
        }));

      setStats({
        todayBookings: todayBookings.length,
        todayRevenue: todayBookings.reduce((sum, b) => sum + b.grandTotal, 0),
        monthlyRevenue: monthBookings.reduce((sum, b) => sum + b.grandTotal, 0),
        monthlyTcs: monthBookings.reduce((sum, b) => sum + (b.tcsDetails?.totalTcs || 0), 0),
        pendingPayments: pendingPayments.reduce((sum, b) => sum + (b.grandTotal - (b.payments?.reduce((s, p) => s + p.amount, 0) || 0)), 0),
        totalClients: clients,
        recentBookings
      });
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const StatCard = ({
    title,
    value,
    icon: Icon,
    trend,
    trendValue,
    color = 'primary'
  }: {
    title: string;
    value: string;
    icon: typeof TrendingUp;
    trend?: 'up' | 'down';
    trendValue?: string;
    color?: 'primary' | 'success' | 'warning' | 'accent';
  }) => {
    const colorClasses = {
      primary: 'bg-primary-50 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400',
      success: 'bg-success-50 dark:bg-success-500/20 text-success-600 dark:text-success-400',
      warning: 'bg-warning-50 dark:bg-warning-500/20 text-warning-600 dark:text-warning-400',
      accent: 'bg-accent-50 dark:bg-accent-500/20 text-accent-600 dark:text-accent-400'
    };

    return (
      <div className="card card-hover">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
            <p className="text-2xl font-display font-bold text-slate-800 dark:text-white mt-1">
              {value}
            </p>
            {trend && trendValue && (
              <div className={clsx(
                'flex items-center gap-1 mt-2 text-sm',
                trend === 'up' ? 'text-success-600' : 'text-danger-600'
              )}>
                {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {trendValue}
              </div>
            )}
          </div>
          <div className={clsx('p-3 rounded-xl', colorClasses[color])}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card h-32 bg-slate-100 dark:bg-slate-700" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-800 dark:text-white">
            Welcome back!
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Here's what's happening with your bookings today.
          </p>
        </div>
        <Link
          to="/bookings/new"
          className="btn btn-primary self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" />
          New Booking
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Revenue"
          value={formatCurrency(stats?.todayRevenue || 0)}
          icon={IndianRupee}
          color="success"
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(stats?.monthlyRevenue || 0)}
          icon={TrendingUp}
          color="primary"
        />
        <StatCard
          title="TCS Collected (Month)"
          value={formatCurrency(stats?.monthlyTcs || 0)}
          icon={FileText}
          color="accent"
        />
        <StatCard
          title="Pending Payments"
          value={formatCurrency(stats?.pendingPayments || 0)}
          icon={Clock}
          color="warning"
        />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-500/20">
            <CalendarDays className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-slate-800 dark:text-white">
              {stats?.todayBookings || 0}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Today's Bookings
            </p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="p-3 rounded-xl bg-success-50 dark:bg-success-500/20">
            <Users className="w-6 h-6 text-success-600 dark:text-success-400" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-slate-800 dark:text-white">
              {stats?.totalClients || 0}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Total Clients
            </p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="p-3 rounded-xl bg-accent-50 dark:bg-accent-500/20">
            <FileText className="w-6 h-6 text-accent-600 dark:text-accent-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              Financial Year
            </p>
            <p className="text-lg font-display font-bold text-slate-800 dark:text-white">
              {fy.code}
            </p>
          </div>
        </div>
      </div>

      {/* Quick actions & Recent bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="card">
          <h3 className="text-lg font-display font-semibold text-slate-800 dark:text-white mb-4">
            Quick Actions
          </h3>
          <div className="space-y-2">
            <Link
              to="/bookings/new"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-500/20">
                  <Plus className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Create New Booking
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              to="/invoices"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success-50 dark:bg-success-500/20">
                  <FileText className="w-4 h-4 text-success-600 dark:text-success-400" />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Generate Invoice
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              to="/clients"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent-50 dark:bg-accent-500/20">
                  <Users className="w-4 h-4 text-accent-600 dark:text-accent-400" />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Add New Client
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              to="/reports"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning-50 dark:bg-warning-500/20">
                  <TrendingUp className="w-4 h-4 text-warning-600 dark:text-warning-400" />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  View Reports
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-display font-semibold text-slate-800 dark:text-white">
              Recent Bookings
            </h3>
            <Link
              to="/bookings"
              className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {stats?.recentBookings && stats.recentBookings.length > 0 ? (
            <div className="space-y-3">
              {stats.recentBookings.map((booking) => (
                <Link
                  key={booking.id}
                  to={`/bookings/${booking.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className={clsx(
                      'p-2 rounded-lg',
                      booking.status === 'PAID'
                        ? 'bg-success-50 dark:bg-success-500/20'
                        : booking.status === 'PENDING'
                          ? 'bg-warning-50 dark:bg-warning-500/20'
                          : 'bg-slate-100 dark:bg-slate-700'
                    )}>
                      {booking.status === 'PAID' ? (
                        <CheckCircle2 className="w-4 h-4 text-success-600 dark:text-success-400" />
                      ) : (
                        <Clock className="w-4 h-4 text-warning-600 dark:text-warning-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-white">
                        {booking.destination}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {booking.date.toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-800 dark:text-white rupee">
                      {booking.amount.toLocaleString('en-IN')}
                    </p>
                    <span className={clsx(
                      'badge',
                      booking.status === 'PAID' ? 'badge-success' :
                        booking.status === 'PENDING' ? 'badge-warning' : 'badge-info'
                    )}>
                      {booking.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CalendarDays className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400">
                No bookings yet. Create your first booking!
              </p>
              <Link
                to="/bookings/new"
                className="btn btn-primary mt-4"
              >
                <Plus className="w-4 h-4" />
                New Booking
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Compliance alerts */}
      <div className="card border-l-4 border-l-warning-500">
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-lg bg-warning-50 dark:bg-warning-500/20">
            <AlertCircle className="w-5 h-5 text-warning-600 dark:text-warning-400" />
          </div>
          <div>
            <h4 className="font-medium text-slate-800 dark:text-white">
              Compliance Reminder
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              TCS returns (Form 27EQ) for Q3 FY {fy.code} are due by January 15th.
              Make sure all TCS collected is deposited and returns filed on time.
            </p>
            <Link
              to="/reports"
              className="text-sm text-primary-600 dark:text-primary-400 hover:underline mt-2 inline-flex items-center gap-1"
            >
              View TCS Report
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
