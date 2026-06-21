import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Ban, CheckCircle, Trash2, Crown, Search } from 'lucide-react';
import Pagination from '../../components/ui/Pagination';

const PAGE_SIZE = 10;

const fetchOwners = async () => {
  const { data } = await api.get('/superadmin/owners');
  return data.data.owners;
};

export default function SuperadminOwners() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: owners = [], isLoading } = useQuery({ queryKey: ['superadmin-owners'], queryFn: fetchOwners });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return owners.filter((o) => {
      const matchSearch = !q || o.name.toLowerCase().includes(q) || o.email.toLowerCase().includes(q) || o.phone.includes(q);
      const matchStatus = statusFilter === 'all' || (statusFilter === 'active' && !o.isSuspended) || (statusFilter === 'suspended' && o.isSuspended);
      return matchSearch && matchStatus;
    });
  }, [owners, search, statusFilter]);

  const handleSearch = (val) => { setSearch(val); setPage(1); };
  const handleStatus = (val) => { setStatusFilter(val); setPage(1); };

  const suspend = useMutation({
    mutationFn: (id) => api.patch(`/superadmin/owners/${id}/suspend`),
    onSuccess: () => { toast.success('Owner suspended'); qc.invalidateQueries(['superadmin-owners']); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const unsuspend = useMutation({
    mutationFn: (id) => api.patch(`/superadmin/owners/${id}/unsuspend`),
    onSuccess: () => { toast.success('Owner unsuspended'); qc.invalidateQueries(['superadmin-owners']); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/superadmin/owners/${id}`),
    onSuccess: () => { toast.success('Owner deleted'); qc.invalidateQueries(['superadmin-owners']); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const handleDelete = (id, name) => {
    if (window.confirm(`Delete owner "${name}"? This cannot be undone.`)) remove.mutate(id);
  };

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (isLoading) return <div className="p-6 text-slate-500">Loading owners…</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-slate-800">Owners</h1>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email or phone…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => handleStatus(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <p className="text-slate-500 text-sm">{filtered.length} of {owners.length} owners</p>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Phone</th>
              <th className="px-4 py-3 text-left">Plan</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Joined</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginated.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No owners found</td></tr>
            )}
            {paginated.map((o) => (
              <tr key={o._id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">
                  <div className="flex items-center gap-2">
                    {o.role === 'staff' && <Crown size={13} className="text-yellow-500" />}
                    {o.name}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">{o.email}</td>
                <td className="px-4 py-3 text-slate-600">{o.phone}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    o.subscription?.plan === 'enterprise' ? 'bg-purple-100 text-purple-700' :
                    o.subscription?.plan === 'pro' ? 'bg-indigo-100 text-indigo-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {o.subscription?.plan ?? 'free'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    o.isSuspended ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
                  }`}>
                    {o.isSuspended ? 'Suspended' : 'Active'}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {new Date(o.createdAt).toLocaleDateString('en-IN')}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {o.isSuspended ? (
                      <button onClick={() => unsuspend.mutate(o._id)} className="p-1.5 rounded hover:bg-green-50 text-green-600" title="Unsuspend">
                        <CheckCircle size={15} />
                      </button>
                    ) : (
                      <button onClick={() => suspend.mutate(o._id)} className="p-1.5 rounded hover:bg-yellow-50 text-yellow-600" title="Suspend">
                        <Ban size={15} />
                      </button>
                    )}
                    <button onClick={() => handleDelete(o._id, o.name)} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Delete">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="px-4 py-3 border-t border-slate-100">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            itemsPerPage={PAGE_SIZE}
            totalItems={filtered.length}
          />
        </div>
      </div>
    </div>
  );
}
