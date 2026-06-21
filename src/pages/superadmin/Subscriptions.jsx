import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Search, CreditCard, X } from 'lucide-react';
import Pagination from '../../components/ui/Pagination';

const PAGE_SIZE = 10;

const PLAN_LIMITS = {
  free:       { properties: 1,   rooms: 20,   tenants: 20 },
  pro:        { properties: 5,   rooms: 100,  tenants: 100 },
  enterprise: { properties: 999, rooms: 9999, tenants: 9999 },
};

const fetchSubscriptions = async () => {
  const { data } = await api.get('/superadmin/subscriptions');
  return data.data.subscriptions;
};

const fetchOwners = async () => {
  const { data } = await api.get('/superadmin/owners');
  return data.data.owners;
};

const planBadge = (plan) => {
  if (plan === 'enterprise') return 'bg-purple-100 text-purple-700';
  if (plan === 'pro') return 'bg-indigo-100 text-indigo-700';
  return 'bg-slate-100 text-slate-600';
};

export default function SuperadminSubscriptions() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [modal, setModal] = useState(null); // { ownerId, ownerName, currentPlan }

  const { data: subs = [], isLoading } = useQuery({ queryKey: ['superadmin-subs'], queryFn: fetchSubscriptions });
  const { data: owners = [] } = useQuery({ queryKey: ['superadmin-owners'], queryFn: fetchOwners });

  // owners without a subscription
  const subOwnerIds = new Set(subs.map((s) => s.owner?._id));
  const unsubscribed = owners.filter((o) => !subOwnerIds.has(o._id));

  const [form, setForm] = useState({ plan: 'free', expiryDate: '' });

  const assign = useMutation({
    mutationFn: ({ ownerId, plan, expiryDate }) =>
      api.post(`/superadmin/subscriptions/${ownerId}`, { plan, expiryDate: expiryDate || undefined }),
    onSuccess: () => {
      toast.success('Plan assigned');
      qc.invalidateQueries(['superadmin-subs']);
      setModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const openModal = (ownerId, ownerName, currentPlan = 'free') => {
    setForm({ plan: currentPlan, expiryDate: '' });
    setModal({ ownerId, ownerName, currentPlan });
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return subs.filter((s) => {
      const name = s.owner?.name?.toLowerCase() || '';
      const email = s.owner?.email?.toLowerCase() || '';
      const matchSearch = !q || name.includes(q) || email.includes(q);
      const matchPlan = planFilter === 'all' || s.plan === planFilter;
      return matchSearch && matchPlan;
    });
  }, [subs, search, planFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (isLoading) return <div className="p-6 text-slate-500">Loading subscriptions…</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Subscriptions</h1>
        {unsubscribed.length > 0 && (
          <button
            onClick={() => openModal(unsubscribed[0]._id, unsubscribed[0].name)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg"
          >
            <CreditCard size={15} /> Assign Plan
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by owner name or email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={planFilter}
          onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Plans</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>

      <p className="text-slate-500 text-sm">{filtered.length} of {subs.length} subscriptions</p>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Owner</th>
              <th className="px-4 py-3 text-left">Plan</th>
              <th className="px-4 py-3 text-left">Limits</th>
              <th className="px-4 py-3 text-left">Start Date</th>
              <th className="px-4 py-3 text-left">Expiry</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginated.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No subscriptions found</td></tr>
            )}
            {paginated.map((s) => {
              const expired = s.expiryDate && new Date(s.expiryDate) < new Date();
              return (
                <tr key={s._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{s.owner?.name}</p>
                    <p className="text-slate-400 text-xs">{s.owner?.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${planBadge(s.plan)}`}>
                      {s.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {s.limits?.properties}P · {s.limits?.rooms}R · {s.limits?.tenants}T
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(s.startDate).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {s.expiryDate ? new Date(s.expiryDate).toLocaleDateString('en-IN') : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      expired ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
                    }`}>
                      {expired ? 'Expired' : 'Active'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openModal(s.owner?._id, s.owner?.name, s.plan)}
                      className="text-indigo-600 hover:underline text-xs font-medium"
                    >
                      Change Plan
                    </button>
                  </td>
                </tr>
              );
            })}
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

      {/* Assign Plan Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">Assign Plan</h2>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <p className="text-sm text-slate-500">Owner: <span className="font-medium text-slate-700">{modal.ownerName}</span></p>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Plan</label>
                <select
                  value={form.plan}
                  onChange={(e) => setForm({ ...form, plan: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="free">Free — 1 property, 20 rooms, 20 tenants</option>
                  <option value="pro">Pro — 5 properties, 100 rooms, 100 tenants</option>
                  <option value="enterprise">Enterprise — Unlimited</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Expiry Date <span className="text-slate-400 font-normal">(optional)</span></label>
                <input
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500 space-y-1">
                <p className="font-medium text-slate-600">Plan limits:</p>
                <p>Properties: {PLAN_LIMITS[form.plan].properties === 999 ? 'Unlimited' : PLAN_LIMITS[form.plan].properties}</p>
                <p>Rooms: {PLAN_LIMITS[form.plan].rooms === 9999 ? 'Unlimited' : PLAN_LIMITS[form.plan].rooms}</p>
                <p>Tenants: {PLAN_LIMITS[form.plan].tenants === 9999 ? 'Unlimited' : PLAN_LIMITS[form.plan].tenants}</p>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setModal(null)}
                className="flex-1 border border-slate-200 text-slate-600 text-sm py-2 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => assign.mutate({ ownerId: modal.ownerId, plan: form.plan, expiryDate: form.expiryDate })}
                disabled={assign.isPending}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm py-2 rounded-lg disabled:opacity-60"
              >
                {assign.isPending ? 'Saving…' : 'Assign Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
