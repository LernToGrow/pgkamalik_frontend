import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import Table from '../../components/ui/Table';
import SearchBar from '../../components/ui/SearchBar';
import Pagination from '../../components/ui/Pagination';

const PAGE_SIZE = 10;

const fetchTenants = async () => {
  const { data } = await api.get('/superadmin/tenants');
  return data.data.tenants;
};

const columns = [
  {
    key: 'name', label: 'Tenant',
    render: (r) => (
      <div>
        <p className="font-medium text-slate-800">{r.name}</p>
        <p className="text-xs text-slate-400">{r.mobile}</p>
      </div>
    ),
  },
  {
    key: 'property', label: 'Property',
    render: (r) => r.property?.name ?? '—',
  },
  {
    key: 'room', label: 'Room',
    render: (r) => r.room?.roomNumber ?? '—',
  },
  {
    key: 'checkIn', label: 'Check-in',
    render: (r) => r.checkIn ? new Date(r.checkIn).toLocaleDateString('en-IN') : '—',
  },
  {
    key: 'status', label: 'Status',
    render: (r) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
        r.status === 'active' ? 'bg-green-100 text-green-700' :
        r.status === 'vacated' ? 'bg-slate-100 text-slate-500' : 'bg-yellow-100 text-yellow-700'
      }`}>
        {r.status}
      </span>
    ),
  },
];

export default function SuperadminTenants() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: tenants = [], isLoading } = useQuery({ queryKey: ['superadmin-tenants'], queryFn: fetchTenants });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tenants.filter((t) => {
      const matchSearch = !q || t.name?.toLowerCase().includes(q) || t.mobile?.includes(q) || t.property?.name?.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || t.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [tenants, search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (isLoading) return <div className="p-6 text-slate-500">Loading tenants…</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-slate-800">All Tenants</h1>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by name, mobile or property…" />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="vacated">Vacated</option>
          <option value="notice">Notice</option>
        </select>
      </div>

      <p className="text-slate-500 text-sm">{filtered.length} of {tenants.length} tenants</p>

      <Table columns={columns} data={paginated} />

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} itemsPerPage={PAGE_SIZE} totalItems={filtered.length} />
    </div>
  );
}
