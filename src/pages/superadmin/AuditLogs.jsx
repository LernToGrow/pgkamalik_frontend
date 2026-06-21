import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import Table from '../../components/ui/Table';
import SearchBar from '../../components/ui/SearchBar';
import Pagination from '../../components/ui/Pagination';

const PAGE_SIZE = 10;

const fetchLogs = async ({ action, resource, page, limit }) => {
  const params = { page, limit };
  if (action !== 'all') params.action = action;
  if (resource !== 'all') params.resource = resource;
  const { data } = await api.get('/superadmin/audit-logs', { params });
  return { logs: data.data.logs, total: data.total };
};

const actionBadge = (a) => {
  const map = {
    CREATE: 'bg-green-100 text-green-700',
    UPDATE: 'bg-blue-100 text-blue-700',
    DELETE: 'bg-red-100 text-red-600',
    SUSPEND: 'bg-orange-100 text-orange-600',
    UNSUSPEND: 'bg-teal-100 text-teal-700',
    FREEZE: 'bg-slate-100 text-slate-600',
    ASSIGN_PLAN: 'bg-purple-100 text-purple-700',
  };
  return map[a] || 'bg-slate-100 text-slate-500';
};

const ACTIONS = ['all', 'CREATE', 'UPDATE', 'DELETE', 'SUSPEND', 'UNSUSPEND', 'FREEZE', 'ASSIGN_PLAN'];
const RESOURCES = ['all', 'Owner', 'Property', 'Tenant', 'RentRecord', 'Subscription', 'AppSettings'];

const columns = [
  {
    key: 'actor', label: 'Actor',
    render: (r) => (
      <div>
        <p className="font-medium text-slate-800">{r.actor?.name ?? '—'}</p>
        <p className="text-xs text-slate-400 capitalize">{r.actorRole}</p>
      </div>
    ),
  },
  {
    key: 'action', label: 'Action',
    render: (r) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${actionBadge(r.action)}`}>
        {r.action}
      </span>
    ),
  },
  { key: 'resource', label: 'Resource' },
  { key: 'details', label: 'Details', render: (r) => <span className="text-slate-600 text-xs">{r.details || '—'}</span> },
  { key: 'ip', label: 'IP', render: (r) => <span className="text-slate-400 text-xs">{r.ip || '—'}</span> },
  {
    key: 'createdAt', label: 'Time',
    render: (r) => (
      <div>
        <p className="text-slate-700 text-xs">{new Date(r.createdAt).toLocaleDateString('en-IN')}</p>
        <p className="text-slate-400 text-xs">{new Date(r.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
      </div>
    ),
  },
];

export default function SuperadminAuditLogs() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [resourceFilter, setResourceFilter] = useState('all');

  const { data = { logs: [], total: 0 }, isLoading } = useQuery({
    queryKey: ['superadmin-audit-logs', actionFilter, resourceFilter, page],
    queryFn: () => fetchLogs({ action: actionFilter, resource: resourceFilter, page, limit: PAGE_SIZE }),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return data.logs.filter((l) =>
      !q || l.actor?.name?.toLowerCase().includes(q) || l.details?.toLowerCase().includes(q)
    );
  }, [data.logs, search]);

  const totalPages = Math.ceil(data.total / PAGE_SIZE);

  if (isLoading) return <div className="p-6 text-slate-500">Loading audit logs…</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-slate-800">Audit Logs</h1>

      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-48">
          <SearchBar value={search} onChange={setSearch} placeholder="Search by actor or details…" />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {ACTIONS.map((a) => <option key={a} value={a}>{a === 'all' ? 'All Actions' : a}</option>)}
        </select>
        <select
          value={resourceFilter}
          onChange={(e) => { setResourceFilter(e.target.value); setPage(1); }}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {RESOURCES.map((r) => <option key={r} value={r}>{r === 'all' ? 'All Resources' : r}</option>)}
        </select>
      </div>

      <p className="text-slate-500 text-sm">{data.total} total log entries</p>

      <Table columns={columns} data={filtered} />

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} itemsPerPage={PAGE_SIZE} totalItems={data.total} />
    </div>
  );
}
