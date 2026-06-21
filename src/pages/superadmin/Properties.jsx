import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { SnowflakeIcon, Flame } from 'lucide-react';
import Table from '../../components/ui/Table';
import SearchBar from '../../components/ui/SearchBar';
import Pagination from '../../components/ui/Pagination';

const PAGE_SIZE = 10;

const fetchProperties = async () => {
  const { data } = await api.get('/superadmin/properties');
  return data.data.properties;
};

const columns = [
  {
    key: 'name',
    label: 'Property',
    render: (r) => (
      <div>
        <p className="font-medium text-slate-800">{r.name}</p>
        <p className="text-xs text-slate-400">{r.city}</p>
      </div>
    ),
  },
  {
    key: 'owner',
    label: 'Owner',
    render: (r) => (
      <div>
        <p className="text-slate-700">{r.owner?.name}</p>
        <p className="text-xs text-slate-400">{r.owner?.email}</p>
      </div>
    ),
  },
  { key: 'address', label: 'Address' },
  {
    key: 'totalFloors',
    label: 'Floors',
    render: (r) => <span className="text-slate-600">{r.totalFloors ?? '—'}</span>,
  },
  {
    key: 'electricityMode',
    label: 'Electricity',
    render: (r) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
        r.electricityMode === 'unit' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
      }`}>
        {r.electricityMode ?? '—'}
      </span>
    ),
  },
  {
    key: 'isActive',
    label: 'Status',
    render: (r) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
        r.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
      }`}>
        {r.isActive ? 'Active' : 'Frozen'}
      </span>
    ),
  },
];

export default function SuperadminProperties() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['superadmin-properties'],
    queryFn: fetchProperties,
  });

  const freeze = useMutation({
    mutationFn: (id) => api.patch(`/superadmin/properties/${id}/freeze`),
    onSuccess: () => { toast.success('Property frozen'); qc.invalidateQueries(['superadmin-properties']); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return properties.filter((p) => {
      const matchSearch = !q ||
        p.name?.toLowerCase().includes(q) ||
        p.city?.toLowerCase().includes(q) ||
        p.owner?.name?.toLowerCase().includes(q) ||
        p.owner?.email?.toLowerCase().includes(q);
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && p.isActive) ||
        (statusFilter === 'frozen' && !p.isActive);
      return matchSearch && matchStatus;
    });
  }, [properties, search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (isLoading) return <div className="p-6 text-slate-500">Loading properties…</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-slate-800">All Properties</h1>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchBar
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search by property, city or owner…"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="frozen">Frozen</option>
        </select>
      </div>

      <p className="text-slate-500 text-sm">{filtered.length} of {properties.length} properties</p>

      <Table
        columns={columns}
        data={paginated}
        actions={(row) =>
          row.isActive ? (
            <button
              onClick={() => {
                if (window.confirm(`Freeze "${row.name}"? Tenants won't be able to access it.`))
                  freeze.mutate(row._id);
              }}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium"
            >
              <SnowflakeIcon size={13} /> Freeze
            </button>
          ) : (
            <span className="text-xs text-slate-400 flex items-center gap-1"><Flame size={13} /> Frozen</span>
          )
        }
      />

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        itemsPerPage={PAGE_SIZE}
        totalItems={filtered.length}
      />
    </div>
  );
}
