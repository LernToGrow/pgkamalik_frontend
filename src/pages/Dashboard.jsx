import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Building2, BedDouble, Banknote, Clock, ArrowRightLeft, MessageSquare, TrendingUp, Banknote as Cash, UserPlus, LogOut, AlertCircle, Zap, Home, Wallet, AlertTriangle, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../api/axios';
import StatCard from '../components/ui/StatCard';
import { useProperty } from '../context/PropertyContext';

const ACTIVITY_META = {
  rent:      { icon: Cash,        bg: 'bg-emerald-50', color: 'text-emerald-600' },
  checkin:   { icon: UserPlus,    bg: 'bg-yellow-50',  color: 'text-yellow-600' },
  checkout:  { icon: LogOut,      bg: 'bg-purple-50',  color: 'text-purple-600' },
  complaint: { icon: MessageSquare, bg: 'bg-red-50',   color: 'text-red-600' },
  expense:   { icon: Banknote,    bg: 'bg-blue-50',    color: 'text-blue-600' },
};
const DEFAULT_ACTIVITY = { icon: AlertCircle, bg: 'bg-indigo-50', color: 'text-indigo-600' };

const ALERT_META = {
  rent:        { icon: Cash,          bg: 'bg-red-50',    color: 'text-red-600' },
  complaint:   { icon: MessageSquare, bg: 'bg-red-50',    color: 'text-red-600' },
  electricity: { icon: Zap,           bg: 'bg-yellow-50', color: 'text-yellow-600' },
  vacancy:     { icon: Home,          bg: 'bg-yellow-50', color: 'text-yellow-600' },
};
const DEFAULT_ALERT = { icon: AlertCircle, bg: 'bg-indigo-50', color: 'text-indigo-600' };

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { propertyId } = useProperty();
  const params = propertyId ? { propertyId } : {};

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', propertyId],
    queryFn: () => api.get('/dashboard', { params }).then((r) => r.data.data),
  });

  const { data: activity = [] } = useQuery({
    queryKey: ['recent-activity', propertyId],
    queryFn: () => api.get('/dashboard/activity', { params }).then((r) => r.data.data),
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['dashboard-alerts', propertyId],
    queryFn: () => api.get('/dashboard/alerts', { params }).then((r) => r.data.data),
  });

  const [trendMonths, setTrendMonths] = useState(6);

  const { data: revenueTrend = [] } = useQuery({
    queryKey: ['revenue-trend', propertyId, trendMonths],
    queryFn: () => api.get('/dashboard/revenue-trend', { params: { ...params, months: trendMonths } }).then((r) => r.data.data),
  });

  const { data: propertyRevenue = [] } = useQuery({
    queryKey: ['property-revenue', propertyId],
    queryFn: () => api.get('/dashboard/property-revenue', { params }).then((r) => r.data.data),
  });

  const stats = data || {};

  const cards = [
    { label: t('dashboard.properties'), value: stats.totalProperties, icon: Building2, color: 'indigo' },
    { label: t('dashboard.totalRooms'), value: stats.totalRooms, icon: BedDouble, color: 'blue' },
    { label: t('dashboard.occupiedBeds'), value: stats.occupiedBeds !== undefined ? `${stats.occupiedBeds} / ${stats.totalBeds}` : '—', icon: BedDouble, color: 'green', sub: stats.occupancyRate !== undefined ? `${stats.occupancyRate}% ${t('dashboard.occupancy')}` : undefined },
    { label: t('dashboard.revenueThisMonth'), value: stats.revenueThisMonth !== undefined ? `₹${Number(stats.revenueThisMonth).toLocaleString()}` : '—', icon: Banknote, color: 'amber', sub: stats.expectedThisMonth ? `of ₹${Number(stats.expectedThisMonth).toLocaleString()} expected` : undefined, progress: stats.collectionRate, growth: stats.revenueGrowth },
    { label: t('dashboard.pendingRent'), value: stats.pendingRent !== undefined ? `₹${Number(stats.pendingRent).toLocaleString()}` : '—', icon: TrendingUp, color: 'red' },
    { label: t('dashboard.openComplaints'), value: stats.openComplaints, icon: MessageSquare, color: 'purple' },
  ];

  const todayCards = [
    { label: t('dashboard.checkInsToday'), value: stats.checkInsToday, icon: ArrowRightLeft, color: 'blue' },
    { label: t('dashboard.checkOutsToday'), value: stats.checkOutsToday, icon: Clock, color: 'amber' },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array(6).fill(0).map((_, i) => (
          <div key={i} className="h-24 bg-white rounded-xl border border-slate-200 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => <StatCard key={c.label} {...c} />)}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {todayCards.map((c) => <StatCard key={c.label} {...c} />)}
      </div>

      {/* Overdue Rent Card */}
      {stats.overdueCount > 0 && (
        <button
          onClick={() => navigate('/tenants', { state: { filter: 'overdue' } })}
          className="w-full bg-red-50 border border-red-200 rounded-xl p-5 flex items-center gap-4 hover:bg-red-100 transition-colors text-left group"
        >
          <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle size={22} className="text-red-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-700">Overdue Rent</p>
            <p className="text-2xl font-bold text-red-600">₹{Number(stats.overdueAmount).toLocaleString()}</p>
            <p className="text-xs text-red-400 mt-0.5">{stats.overdueCount} tenant{stats.overdueCount > 1 ? 's' : ''} past due date — click to view</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-block bg-red-100 text-red-600 text-xs font-bold px-2.5 py-1 rounded-full">Action Needed</span>
            <ChevronRight size={18} className="text-red-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>
      )}

      {/* Revenue vs Expenses */}
      {stats.revenueThisMonth !== undefined && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-800">Revenue vs Expenses</h2>
            <span className={`text-sm font-bold px-2 py-1 rounded-lg ${stats.netIncome >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
              Net {stats.netIncome >= 0 ? '+' : ''}₹{Number(stats.netIncome).toLocaleString()}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                <Wallet size={16} className="text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Revenue</p>
                <p className="text-base font-bold text-green-600">₹{Number(stats.revenueThisMonth).toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <TrendingUp size={16} className="text-red-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Expenses</p>
                <p className="text-base font-bold text-red-500">₹{Number(stats.expensesThisMonth).toLocaleString()}</p>
              </div>
            </div>
          </div>
          {/* Stacked bar */}
          {(stats.revenueThisMonth + stats.expensesThisMonth) > 0 && (() => {
            const total = stats.revenueThisMonth + stats.expensesThisMonth;
            const revPct = Math.round((stats.revenueThisMonth / total) * 100);
            const expPct = 100 - revPct;
            return (
              <div className="h-2 rounded-full overflow-hidden flex gap-0.5">
                <div className="bg-green-500 rounded-l-full" style={{ width: `${revPct}%` }} />
                <div className="bg-red-400 rounded-r-full" style={{ width: `${expPct}%` }} />
              </div>
            );
          })()}
          <div className="flex justify-between text-[11px] text-slate-400 mt-1.5">
            <span>Revenue share</span>
            <span>Expense share</span>
          </div>
        </div>
      )}

      {/* Revenue Trend Chart */}
      {revenueTrend.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-800">Revenue Trend</h2>
            <div className="flex gap-1">
              {[3, 6, 12].map((m) => (
                <button
                  key={m}
                  onClick={() => setTrendMonths(m)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                    trendMonths === m
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {m}M
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueTrend} barCategoryGap="30%" barGap={4}>
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`}
                width={48}
              />
              <Tooltip
                formatter={(value, name) => [`₹${Number(value).toLocaleString('en-IN')}`, name]}
                contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }}
                cursor={{ fill: '#f1f5f9' }}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#f87171" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Property-wise Revenue Breakdown */}
      {propertyRevenue.length > 1 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="font-bold text-slate-800 mb-4">Property Revenue — This Month</h2>
          <div className="space-y-4">
            {propertyRevenue.map((p, i) => (
              <div key={p.id}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-[11px] font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-sm font-semibold text-slate-700 truncate">{p.name}</span>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <span className="text-sm font-bold text-slate-800">₹{Number(p.collected).toLocaleString()}</span>
                    <span className="text-xs text-slate-400 ml-1">/ ₹{Number(p.expected).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${p.rate >= 80 ? 'bg-green-500' : p.rate >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                      style={{ width: `${Math.min(p.rate, 100)}%` }}
                    />
                  </div>
                  <span className={`text-[11px] font-semibold w-10 text-right ${p.rate >= 80 ? 'text-green-600' : p.rate >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                    {p.rate}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerts + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-800">{t('dashboard.alerts')}</h2>
          </div>
          <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <AlertCircle size={32} className="mb-2" />
                <p className="text-sm font-medium">{t('dashboard.allCaughtUp')}</p>
              </div>
            ) : alerts.map((a, i) => {
              const meta = ALERT_META[a.type] || DEFAULT_ALERT;
              const Icon = meta.icon;
              return (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <div className={`w-9 h-9 rounded-xl ${meta.bg} flex items-center justify-center shrink-0`}>
                    <Icon size={16} className={meta.color} />
                  </div>
                  <p className="text-sm text-slate-700 font-medium">{a.message}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-800">{t('dashboard.recentActivity')}</h2>
          </div>
          <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
            {activity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <Clock size={32} className="mb-2" />
                <p className="text-sm font-medium">{t('dashboard.noActivityYet')}</p>
              </div>
            ) : activity.map((ev, i) => {
              const meta = ACTIVITY_META[ev.type] || DEFAULT_ACTIVITY;
              const Icon = meta.icon;
              return (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <div className={`w-9 h-9 rounded-xl ${meta.bg} flex items-center justify-center shrink-0`}>
                    <Icon size={16} className={meta.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{ev.title}</p>
                    <p className="text-xs text-slate-400 truncate">{ev.sub}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {ev.amount && <p className={`text-xs font-bold ${meta.color}`}>{ev.amount}</p>}
                    <p className="text-[11px] text-slate-400">{timeAgo(ev.time)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
