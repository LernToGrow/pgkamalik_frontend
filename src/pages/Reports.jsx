import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Mail, ChevronLeft, ChevronRight, Loader2, Download, BarChart2, Home, AlertTriangle, CalendarDays, X } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';
import api from '../api/axios';
import { useProperty } from '../context/PropertyContext';
import StatCard from '../components/ui/StatCard';
import { Banknote, TrendingDown, TrendingUp, DollarSign, UserPlus, LogOut, CheckCircle2, Percent } from 'lucide-react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const now = new Date();

const STATUS_COLORS = {
  paid:    { bg: 'bg-green-100',  text: 'text-green-700'  },
  partial: { bg: 'bg-amber-100',  text: 'text-amber-700'  },
  pending: { bg: 'bg-slate-100',  text: 'text-slate-600'  },
  overdue: { bg: 'bg-red-100',    text: 'text-red-700'    },
};

const EXPENSE_COLORS = ['#6366f1','#f59e0b','#10b981','#ef4444','#8b5cf6','#0ea5e9','#f97316'];

const TABS = [
  { id: 'summary',   label: 'Summary',          icon: BarChart2  },
  { id: 'rent',      label: 'Rent Breakdown',   icon: Home       },
  { id: 'expenses',  label: 'Expense Details',  icon: DollarSign },
  { id: 'defaulters',label: 'Defaulters',       icon: AlertTriangle },
];

function pctChange(curr, prev) {
  if (!prev) return null;
  return parseFloat((((curr - prev) / prev) * 100).toFixed(1));
}

export default function Reports() {
  const { t } = useTranslation();
  const { propertyId } = useProperty();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear]   = useState(now.getFullYear());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]     = useState('');
  const [tab, setTab]     = useState('summary');

  const hasRange = startDate && endDate;

  const qs = (extra = '') => {
    const prop = propertyId ? `&propertyId=${propertyId}` : '';
    if (hasRange) return `startDate=${startDate}&endDate=${endDate}${prop}${extra}`;
    return `month=${month}&year=${year}${prop}${extra}`;
  };

  const clearRange = () => { setStartDate(''); setEndDate(''); };

  const selectMonth = (i) => {
    setMonth(i + 1);
    clearRange();
  };

  const handleYearChange = (delta) => {
    setYear((y) => y + delta);
    clearRange();
  };


  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['reports', month, year, propertyId, startDate, endDate],
    queryFn: () => api.get(`/reports/monthly?${qs()}`).then((r) => r.data.data),
  });

  const { data: details, isLoading: loadingDetails } = useQuery({
    queryKey: ['reports-details', month, year, propertyId, startDate, endDate],
    queryFn: () => api.get(`/reports/details?${qs()}`).then((r) => r.data.data),
  });

  const sendEmail = useMutation({
    mutationFn: () => api.post('/reports/send-email', { month, year }),
    onSuccess: (res) => toast.success(res.data.message),
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to send report'),
  });

  const downloadReport = useMutation({
    mutationFn: async () => {
      const res = await api.get(`/reports/download?${qs()}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pg-report-${MONTHS[month - 1].toLowerCase()}-${year}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: () => toast.error(t('toast.downloadFailed')),
  });

  const r   = summary  || {};
  const d   = details  || {};
  const prev = d.prevMonth || {};

  const summaryCards = [
    {
      label: t('reports.totalRentCollected'),
      value: r.totalRentCollected !== undefined ? `₹${Number(r.totalRentCollected).toLocaleString()}` : '—',
      icon: Banknote, color: 'green',
      growth: pctChange(r.totalRentCollected, prev.collected),
      sub: prev.collected != null ? `Prev: ₹${Number(prev.collected).toLocaleString()}` : undefined,
    },
    {
      label: t('reports.pendingRent'),
      value: r.pendingRent !== undefined ? `₹${Number(r.pendingRent).toLocaleString()}` : '—',
      icon: TrendingUp, color: 'red',
      growth: prev.pending != null ? pctChange(r.pendingRent, prev.pending) : null,
      sub: prev.pending != null ? `Prev: ₹${Number(prev.pending).toLocaleString()}` : undefined,
    },
    {
      label: t('reports.totalExpenses'),
      value: r.totalExpenses !== undefined ? `₹${Number(r.totalExpenses).toLocaleString()}` : '—',
      icon: DollarSign, color: 'amber',
      growth: prev.expenses != null ? pctChange(r.totalExpenses, prev.expenses) : null,
      sub: prev.expenses != null ? `Prev: ₹${Number(prev.expenses).toLocaleString()}` : undefined,
    },
    {
      label: t('reports.netIncome'),
      value: r.netIncome !== undefined ? `₹${Number(r.netIncome).toLocaleString()}` : '—',
      icon: TrendingDown, color: 'indigo',
    },
    { label: t('reports.newTenants'), value: r.newTenants, icon: UserPlus, color: 'blue' },
    { label: t('reports.moveOuts'),   value: r.moveOuts,   icon: LogOut,   color: 'purple' },
    {
      label: 'Collection Efficiency',
      value: d.collectionEfficiency != null ? `${d.collectionEfficiency}%` : '—',
      icon: Percent, color: d.collectionEfficiency >= 80 ? 'green' : 'amber',
      progress: d.collectionEfficiency,
    },
    {
      label: 'Occupancy Rate',
      value: d.occupancy ? `${d.occupancy.occupancyRate}%` : '—',
      icon: CheckCircle2, color: 'blue',
      sub: d.occupancy ? `${d.occupancy.occupiedBeds}/${d.occupancy.totalBeds} beds occupied` : undefined,
      progress: d.occupancy?.occupancyRate,
    },
  ];

  const isLoading = loadingSummary || loadingDetails;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        {/* Month pills */}
        <div className="flex flex-wrap gap-2">
          {MONTHS.map((m, i) => (
            <button
              key={m}
              onClick={() => selectMonth(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                !hasRange && month === i + 1 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: year nav + month picker + date range */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <button onClick={() => handleYearChange(-1)} className="text-indigo-600 hover:text-indigo-800 font-bold px-1">
                <ChevronLeft size={22} />
              </button>
              <span className="text-lg font-bold text-slate-800">{year}</span>
              <button onClick={() => handleYearChange(1)} className="text-indigo-600 hover:text-indigo-800 font-bold px-1">
                <ChevronRight size={22} />
              </button>
            </div>

            {/* Date range picker */}
            <div className={`flex items-center gap-2 border rounded-lg px-3 py-1.5 transition-colors ${hasRange ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-slate-50'}`}>
              <CalendarDays size={14} className={hasRange ? 'text-indigo-500' : 'text-slate-400'} />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-sm text-slate-700 bg-transparent focus:outline-none w-32"
              />
              <span className="text-slate-400 text-sm">—</span>
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-sm text-slate-700 bg-transparent focus:outline-none w-32"
              />
              {hasRange && (
                <button onClick={clearRange} className="text-indigo-400 hover:text-red-500 transition-colors ml-1" title="Clear date range">
                  <X size={14} />
                </button>
              )}
            </div>
            {hasRange && (
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-full">
                Custom range active
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => downloadReport.mutate()}
              disabled={downloadReport.isPending}
              className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {downloadReport.isPending ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              {downloadReport.isPending ? t('reports.downloading') : t('reports.downloadReport')}
            </button>
            <button
              onClick={() => sendEmail.mutate()}
              disabled={sendEmail.isPending}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {sendEmail.isPending ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
              {sendEmail.isPending ? t('reports.sending') : t('reports.emailReport')}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-semibold transition-colors ${
              tab === id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon size={14} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Tab: Summary */}
      {tab === 'summary' && (
        isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array(8).fill(0).map((_, i) => <div key={i} className="h-24 bg-white rounded-xl border border-slate-200 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {summaryCards.map((c) => <StatCard key={c.label} {...c} />)}
          </div>
        )
      )}

      {/* Tab: Rent Breakdown */}
      {tab === 'rent' && (
        <div className="space-y-4">
          {loadingDetails ? (
            Array(3).fill(0).map((_, i) => <div key={i} className="h-32 bg-white rounded-xl border border-slate-200 animate-pulse" />)
          ) : !d.rentBreakdown?.length ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">No rent records for this period.</div>
          ) : (
            d.rentBreakdown.map((room) => (
              <div key={room.roomNumber} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Home size={15} className="text-slate-400" />
                    <span className="font-bold text-slate-700">Room {room.roomNumber}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-semibold">
                    <span className="text-green-600">Collected ₹{Number(room.collected).toLocaleString()}</span>
                    {room.pending > 0 && <span className="text-red-500">Pending ₹{Number(room.pending).toLocaleString()}</span>}
                    <span className="text-slate-400">Total ₹{Number(room.total).toLocaleString()}</span>
                  </div>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-400 uppercase border-b border-slate-100">
                      <th className="text-left px-5 py-2">Tenant</th>
                      <th className="text-left px-3 py-2">Bed</th>
                      <th className="text-right px-3 py-2">Rent Due</th>
                      <th className="text-right px-3 py-2">Paid</th>
                      <th className="text-right px-3 py-2">Balance</th>
                      <th className="text-left px-3 py-2">Status</th>
                      <th className="text-left px-5 py-2">Due Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {room.tenants.map((t, i) => {
                      const sc = STATUS_COLORS[t.status] || STATUS_COLORS.pending;
                      return (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-5 py-3 font-medium text-slate-800">{t.name}</td>
                          <td className="px-3 py-3 text-slate-500">{t.bedLabel}</td>
                          <td className="px-3 py-3 text-right text-slate-700">₹{Number(t.totalAmount).toLocaleString()}</td>
                          <td className="px-3 py-3 text-right text-green-600 font-medium">₹{Number(t.paidAmount).toLocaleString()}</td>
                          <td className="px-3 py-3 text-right text-red-500 font-medium">
                            {t.totalAmount - t.paidAmount > 0 ? `₹${Number(t.totalAmount - t.paidAmount).toLocaleString()}` : '—'}
                          </td>
                          <td className="px-3 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${sc.bg} ${sc.text}`}>{t.status}</span>
                          </td>
                          <td className="px-5 py-3 text-slate-400 text-xs">
                            {t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-IN') : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Expense Details */}
      {tab === 'expenses' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-700 mb-4">Expenses by Category</p>
            {loadingDetails ? (
              <div className="h-52 animate-pulse bg-slate-100 rounded-lg" />
            ) : !d.expensesByCategory?.length ? (
              <p className="text-slate-400 text-sm text-center py-10">No expenses this month.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={d.expensesByCategory} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v.toLocaleString()}`} />
                  <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip formatter={(v) => `₹${Number(v).toLocaleString()}`} />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                    {d.expensesByCategory.map((_, i) => (
                      <Cell key={i} fill={EXPENSE_COLORS[i % EXPENSE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
              <p className="text-sm font-bold text-slate-700">Category Breakdown</p>
            </div>
            {loadingDetails ? (
              <div className="p-5 space-y-3">
                {Array(5).fill(0).map((_, i) => <div key={i} className="h-8 animate-pulse bg-slate-100 rounded" />)}
              </div>
            ) : !d.expensesByCategory?.length ? (
              <p className="text-slate-400 text-sm text-center py-10">No expenses this month.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-400 uppercase border-b border-slate-100">
                    <th className="text-left px-5 py-2">Category</th>
                    <th className="text-right px-3 py-2">Entries</th>
                    <th className="text-right px-5 py-2">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {d.expensesByCategory.map((e, i) => (
                    <tr key={e.category} className="hover:bg-slate-50">
                      <td className="px-5 py-3 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: EXPENSE_COLORS[i % EXPENSE_COLORS.length] }} />
                        <span className="font-medium text-slate-700 capitalize">{e.category.replace(/_/g, ' ')}</span>
                      </td>
                      <td className="px-3 py-3 text-right text-slate-400">{e.count}</td>
                      <td className="px-5 py-3 text-right font-bold text-slate-800">₹{Number(e.total).toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 border-t border-slate-200">
                    <td className="px-5 py-3 font-bold text-slate-700">Total</td>
                    <td className="px-3 py-3 text-right text-slate-400">
                      {d.expensesByCategory.reduce((s, e) => s + e.count, 0)}
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-indigo-600">
                      ₹{Number(d.expensesByCategory.reduce((s, e) => s + e.total, 0)).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tab: Defaulters */}
      {tab === 'defaulters' && (
        <div className="space-y-4">
          {/* Aging buckets */}
          {d.aging && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Not Yet Due', value: d.aging.notDue,    color: 'bg-slate-100 text-slate-700' },
                { label: '1–7 Days',   value: d.aging.days1to7,  color: 'bg-amber-50 text-amber-700' },
                { label: '8–30 Days',  value: d.aging.days8to30, color: 'bg-orange-50 text-orange-700' },
                { label: '30+ Days',   value: d.aging.days30plus, color: 'bg-red-50 text-red-700' },
              ].map((b) => (
                <div key={b.label} className={`rounded-xl border border-slate-200 p-4 text-center ${b.color}`}>
                  <p className="text-3xl font-bold">{b.value}</p>
                  <p className="text-xs font-semibold mt-1">{b.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Defaulter list from rent breakdown */}
          {loadingDetails ? (
            Array(3).fill(0).map((_, i) => <div key={i} className="h-20 bg-white rounded-xl border border-slate-200 animate-pulse" />)
          ) : (() => {
            const rows = (d.rentBreakdown || []).flatMap((room) =>
              room.tenants
                .filter((t) => ['pending', 'overdue', 'partial'].includes(t.status))
                .map((t) => ({ ...t, roomNumber: room.roomNumber }))
            );
            if (!rows.length) return (
              <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
                <CheckCircle2 className="mx-auto text-green-400 mb-2" size={36} />
                <p className="text-slate-500 font-medium">All tenants have paid for this month!</p>
              </div>
            );
            const diffDays = (dueDate) => dueDate
              ? Math.max(0, Math.floor((Date.now() - new Date(dueDate)) / 86400000))
              : null;
            return (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-400 uppercase border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-5 py-2">Tenant</th>
                      <th className="text-left px-3 py-2">Room / Bed</th>
                      <th className="text-right px-3 py-2">Total Due</th>
                      <th className="text-right px-3 py-2">Paid</th>
                      <th className="text-right px-3 py-2">Balance</th>
                      <th className="text-left px-3 py-2">Status</th>
                      <th className="text-right px-5 py-2">Days Overdue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {rows.map((t, i) => {
                      const sc = STATUS_COLORS[t.status] || STATUS_COLORS.pending;
                      const days = diffDays(t.dueDate);
                      return (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-5 py-3 font-medium text-slate-800">{t.name}</td>
                          <td className="px-3 py-3 text-slate-500">Rm {t.roomNumber} / {t.bedLabel}</td>
                          <td className="px-3 py-3 text-right text-slate-700">₹{Number(t.totalAmount).toLocaleString()}</td>
                          <td className="px-3 py-3 text-right text-green-600">₹{Number(t.paidAmount).toLocaleString()}</td>
                          <td className="px-3 py-3 text-right font-bold text-red-500">₹{Number(t.totalAmount - t.paidAmount).toLocaleString()}</td>
                          <td className="px-3 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${sc.bg} ${sc.text}`}>{t.status}</span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            {days != null ? (
                              <span className={`font-semibold text-xs ${days > 30 ? 'text-red-600' : days > 7 ? 'text-orange-500' : days > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
                                {days > 0 ? `${days}d` : 'Not due'}
                              </span>
                            ) : '—'}
                          </td>
                        </tr>
                      );
                    })
                    }
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
