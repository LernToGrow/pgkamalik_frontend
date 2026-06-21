import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { Building2, Users, BedDouble, Banknote, TrendingUp, AlertCircle } from 'lucide-react';

const fetchStats = async () => {
  const { data } = await api.get('/superadmin/stats');
  return data.data;
};

const StatCard = ({ label, value, icon: Icon, color }) => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex items-center gap-4">
    <div className={`p-3 rounded-lg ${color}`}>
      <Icon size={22} className="text-white" />
    </div>
    <div>
      <p className="text-slate-500 text-sm">{label}</p>
      <p className="text-2xl font-bold text-slate-800">{value ?? '—'}</p>
    </div>
  </div>
);

export default function SuperadminDashboard() {
  const { data, isLoading, error } = useQuery({ queryKey: ['superadmin-stats'], queryFn: fetchStats });

  if (isLoading) return <div className="p-8 text-slate-500">Loading platform stats…</div>;
  if (error) return <div className="p-8 text-red-500">Failed to load stats.</div>;

  const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN')}`;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Platform Overview</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Owners" value={data.owners} icon={Users} color="bg-indigo-500" />
        <StatCard label="Properties" value={data.properties} icon={Building2} color="bg-emerald-500" />
        <StatCard label="Rooms" value={data.rooms} icon={BedDouble} color="bg-violet-500" />
        <StatCard label="Active Tenants" value={data.activeTenants} icon={Users} color="bg-sky-500" />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-700 mb-3">Rent Collection</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Collected" value={fmt(data.rent?.collected)} icon={Banknote} color="bg-green-500" />
          <StatCard label="Pending" value={fmt(data.rent?.pending)} icon={TrendingUp} color="bg-yellow-500" />
          <StatCard label="Overdue" value={fmt(data.rent?.overdue)} icon={AlertCircle} color="bg-red-500" />
          <StatCard label="Partial" value={fmt(data.rent?.partial)} icon={Banknote} color="bg-orange-400" />
        </div>
      </div>
    </div>
  );
}
