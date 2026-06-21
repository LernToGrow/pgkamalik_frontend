import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import Table from '../../components/ui/Table';
import SearchBar from '../../components/ui/SearchBar';
import Pagination from '../../components/ui/Pagination';

const PAGE_SIZE = 10;

const fetchComplaints = async (status) => {
  const params = status !== 'all' ? { status } : {};
  const { data } = await api.get('/superadmin/complaints', { params });
  return data.data.complaints;
};

const priorityBadge = (p) => {
  const map = { high: 'bg-red-100 text-red-600', medium: 'bg-yellow-100 text-yellow-700', low: 'bg-green-100 text-green-700' };
  return map[p] || 'bg-slate-100 text-slate-500';
};

const statusBadge = (s) => {
  const map = { open: 'bg-blue-100 text-blue-700', in_progress: 'bg-yellow-100 text-yellow-700', resolved: 'bg-green-100 text-green-700', closed: 'bg-slate-100 text-slate-500' };
  return map[s] || 'bg-slate-100 text-slate-500';
};

const columns = [
  {
    key: 'tenant', label: 'Tenant',
    render: (r) => r.tenant?.name ?? '—',
  },
  {
    key: 'property', label: 'Property',
    render: (r) => r.property?.name ?? '—',
  },
  { key: 'category', label: 'Category', render: (r) => <span className="capitalize">{r.category ?? '—'}</span> },
  {
    key: 'description', label: 'Description',
    render: (r) => <span className="line-clamp-1 max-w-xs text-slate-600">{r.description}</span>,
  },
  {
    key: 'priority', label: 'Priority',
    render: (r) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${priorityBadge(r.priority)}`}>
        {r.priority}
      </span>
    ),
  },
  {
    key: 'status', label: 'Status',
    render: (r) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge(r.status)}`}>
        {r.status?.replace('_', ' ')}
      </span>
    ),
  },
  {
    key: 'createdAt', label: 'Raised',
    render: (r) => new Date(r.createdAt).toLocaleDateString('en-IN'),
  },
];

export default function SuperadminComplaints() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ['superadmin-complaints', statusFilter],
    queryFn: () => fetchComplaints(statusFilter),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return complaints.filter((c) =>
      !q || c.tenant?.name?.toLowerCase().includes(q) || c.property?.name?.toLowerCase().includes(q) || c.category?.toLowerCase().includes(q)
    );
  }, [complaints, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (isLoading) return <div className="p-6 text-slate-500">Loading complaints…</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-slate-800">All Complaints</h1>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by tenant, property or category…" />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <p className="text-slate-500 text-sm">{filtered.length} of {complaints.length} complaints</p>

      <Table columns={columns} data={paginated} />

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} itemsPerPage={PAGE_SIZE} totalItems={filtered.length} />
    </div>
  );
}
