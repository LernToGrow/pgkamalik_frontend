import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import Table from '../../components/ui/Table';
import SearchBar from '../../components/ui/SearchBar';
import Pagination from '../../components/ui/Pagination';

const PAGE_SIZE = 10;

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const fetchRecords = async ({ month, year }) => {
  const params = {};
  if (month) params.month = month;
  if (year) params.year = year;
  const { data } = await api.get('/superadmin/rent-records', { params });
  return data.data.rentRecords;
};

const statusBadge = (s) => {
  const map = { paid: 'bg-green-100 text-green-700', pending: 'bg-yellow-100 text-yellow-700', overdue: 'bg-red-100 text-red-600', partial: 'bg-orange-100 text-orange-600' };
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
  {
    key: 'period', label: 'Period',
    render: (r) => `${MONTHS[(r.month ?? 1) - 1]} ${r.year}`,
  },
  {
    key: 'rentAmount', label: 'Rent',
    render: (r) => `₹${(r.rentAmount || 0).toLocaleString('en-IN')}`,
  },
  {
    key: 'totalAmount', label: 'Total',
    render: (r) => <span className="font-medium">₹{(r.totalAmount || 0).toLocaleString('en-IN')}</span>,
  },
  {
    key: 'status', label: 'Status',
    render: (r) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge(r.status)}`}>
        {r.status}
      </span>
    ),
  },
  {
    key: 'dueDate', label: 'Due Date',
    render: (r) => r.dueDate ? new Date(r.dueDate).toLocaleDateString('en-IN') : '—',
  },
];

export default function SuperadminRentRecords() {
  const now = new Date();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['superadmin-rent-records', month, year],
    queryFn: () => fetchRecords({ month, year }),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return records.filter((r) => {
      const matchSearch = !q || r.tenant?.name?.toLowerCase().includes(q) || r.property?.name?.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [records, search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  if (isLoading) return <div className="p-6 text-slate-500">Loading rent records…</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-slate-800">Rent Records</h1>

      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-48">
          <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by tenant or property…" />
        </div>
        <select
          value={month}
          onChange={(e) => { setMonth(Number(e.target.value)); setPage(1); }}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select
          value={year}
          onChange={(e) => { setYear(Number(e.target.value)); setPage(1); }}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="partial">Partial</option>
        </select>
      </div>

      <p className="text-slate-500 text-sm">{filtered.length} of {records.length} records</p>

      <Table columns={columns} data={paginated} />

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} itemsPerPage={PAGE_SIZE} totalItems={filtered.length} />
    </div>
  );
}
