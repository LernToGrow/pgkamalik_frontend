import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import SearchBar from '../components/ui/SearchBar';
import { useProperty } from '../context/PropertyContext';

const priorityColor = { low: 'slate', medium: 'amber', high: 'red' };
const statusColor = { open: 'red', assigned: 'blue', in_progress: 'amber', resolved: 'green' };
const categories = ['plumbing', 'electrical', 'cleaning', 'furniture', 'pest_control', 'security', 'other'];
const empty = { tenant: '', property: '', room: '', category: 'other', description: '', priority: 'medium' };

export default function Complaints() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const { propertyId } = useProperty();

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => { setPage(1); }, [propertyId]);

  const { data: complaintsData, isLoading } = useQuery({
    queryKey: ['complaints', page, limit, search, propertyId],
    queryFn: () => api.get('/complaints', { params: { page, limit, ...(search && { search }), ...(propertyId && { propertyId }) } }).then((r) => r.data),
  });

  const data = complaintsData?.data?.complaints;
  const complaintsPagination = complaintsData?.pagination;

  const { data: tenants } = useQuery({ queryKey: ['tenants'], queryFn: () => api.get('/tenants', { params: { limit: 100 } }).then((r) => r.data.data.tenants) });
  const { data: properties } = useQuery({ queryKey: ['properties'], queryFn: () => api.get('/properties', { params: { limit: 100 } }).then((r) => r.data.data.properties) });
  const { data: rooms } = useQuery({
    queryKey: ['rooms', form.property],
    queryFn: () => form.property ? api.get(`/rooms?propertyId=${form.property}&limit=100`).then((r) => r.data.data.rooms) : Promise.resolve([]),
    enabled: !!form.property,
  });

  const save = useMutation({
    mutationFn: (d) => editing
      ? api.patch(`/complaints/${editing}/status`, { status: d.status || 'open' })
      : api.post('/complaints', d),
    onSuccess: () => { qc.invalidateQueries(['complaints']); setModal(null); toast.success(t('toast.saved')); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/complaints/${id}`),
    onSuccess: () => { qc.invalidateQueries(['complaints']); toast.success(t('toast.deleted')); },
  });

  const openAdd = () => { setForm(empty); setEditing(null); setModal('form'); };
  const openEdit = (row) => {
    setForm({ tenant: row.tenant?._id || '', property: '', room: row.room?._id || '', category: row.category, description: row.description || '', priority: row.priority, status: row.status });
    setEditing(row._id); setModal('form');
  };

  const columns = [
    { key: 'category', label: t('col.category'), render: (r) => r.category ? t(`enum.${r.category}`) : '—' },
    { key: 'tenant', label: t('col.tenant'), render: (r) => r.tenant?.name || '—' },
    { key: 'room', label: t('col.room'), render: (r) => r.room?.roomNumber || '—' },
    { key: 'priority', label: t('col.priority'), render: (r) => <Badge label={r.priority ? t(`enum.${r.priority}`) : '—'} variant={priorityColor[r.priority]} /> },
    { key: 'status', label: t('col.status'), render: (r) => <Badge label={r.status ? t(`enum.${r.status}`) : '—'} variant={statusColor[r.status]} /> },
    { key: 'createdAt', label: t('col.date'), render: (r) => r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="text-sm text-slate-500 shrink-0">{complaintsPagination?.total ?? data?.length ?? 0} {t('col.complaints')}</p>
        <div className="flex-1"><SearchBar value={searchInput} onChange={setSearchInput} placeholder={t('search.category')} /></div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors shrink-0">
          <Plus size={16} /> {t('complaints.addComplaint')}
        </button>
      </div>

      {isLoading ? <div className="h-40 bg-white rounded-xl border border-slate-200 animate-pulse" /> : (
        <>
          <Table columns={columns} data={data || []}
            actions={(row) => (
              <div className="flex gap-2">
                <button onClick={() => openEdit(row)} className="text-slate-400 hover:text-indigo-600"><Pencil size={15} /></button>
                <button onClick={() => { if (confirm(t('confirm.delete'))) remove.mutate(row._id); }} className="text-slate-400 hover:text-red-600"><Trash2 size={15} /></button>
              </div>
            )}
          />
          <Pagination
            currentPage={page}
            totalPages={complaintsPagination?.totalPages ?? 1}
            onPageChange={setPage}
            itemsPerPage={limit}
            onItemsPerPageChange={setLimit}
            totalItems={complaintsPagination?.total}
          />
        </>
      )}

      {modal === 'form' && (
        <Modal title={editing ? t('complaints.updateStatus') : t('complaints.addComplaint')} onClose={() => setModal(null)}>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }} className="space-y-4">
            {!editing && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.tenant')}</label>
                  <select required value={form.tenant} onChange={(e) => setForm({ ...form, tenant: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">{t('common.selectTenant')}</option>
                    {(tenants || []).map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.property')}</label>
                  <select required value={form.property} onChange={(e) => setForm({ ...form, property: e.target.value, room: '' })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">{t('common.selectProperty')}</option>
                    {(properties || []).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.room')}</label>
                  <select required value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">{t('common.selectRoom')}</option>
                    {(rooms || []).map((r) => <option key={r._id} value={r._id}>{r.roomNumber}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('complaints.category')}</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {categories.map((c) => <option key={c} value={c}>{t(`enum.${c}`)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('complaints.description')}</label>
                  <textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('complaints.priority')}</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {['low', 'medium', 'high'].map((s) => <option key={s} value={s}>{t(`enum.${s}`)}</option>)}
                  </select>
                </div>
              </>
            )}
            {editing && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('complaints.status')}</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {['open', 'assigned', 'in_progress', 'resolved'].map((s) => <option key={s} value={s}>{t(`enum.${s}`)}</option>)}
                </select>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)} className="flex-1 border border-slate-300 text-slate-700 py-2 rounded-lg text-sm hover:bg-slate-50">{t('common.cancel')}</button>
              <button type="submit" disabled={save.isPending} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-60">
                {save.isPending ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
