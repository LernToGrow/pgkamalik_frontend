
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

const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const empty = { tenant: '', property: '', room: '', month: '', year: new Date().getFullYear(), mode: 'meter', previousReading: '', currentReading: '', ratePerUnit: '', fixedCharge: '', dueDate: '', status: 'unpaid' };

export default function Electricity() {
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

  const { data: elecData, isLoading } = useQuery({
    queryKey: ['electricity', page, limit, search, propertyId],
    queryFn: () => api.get('/electricity', { params: { page, limit, ...(search && { search }), ...(propertyId && { propertyId }) } }).then((r) => r.data),
  });

  const data = elecData?.data?.bills;
  const elecPagination = elecData?.pagination;

  const { data: tenants } = useQuery({ queryKey: ['tenants'], queryFn: () => api.get('/tenants', { params: { limit: 100 } }).then((r) => r.data.data.tenants) });
  const { data: properties } = useQuery({ queryKey: ['properties'], queryFn: () => api.get('/properties', { params: { limit: 100 } }).then((r) => r.data.data.properties) });
  const { data: rooms } = useQuery({
    queryKey: ['rooms', form.property],
    queryFn: () => form.property ? api.get(`/rooms?propertyId=${form.property}&limit=100`).then((r) => r.data.data.rooms) : Promise.resolve([]),
    enabled: !!form.property,
  });

  const save = useMutation({
    mutationFn: (d) => editing ? api.put(`/electricity/${editing}`, d) : api.post('/electricity', d),
    onSuccess: () => { qc.invalidateQueries(['electricity']); setModal(null); toast.success(t('toast.saved')); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/electricity/${id}`),
    onSuccess: () => { qc.invalidateQueries(['electricity']); toast.success(t('toast.deleted')); },
  });

  const openAdd = () => { setForm(empty); setEditing(null); setModal('form'); };
  const openEdit = (row) => {
    setForm({ tenant: row.tenant?._id || '', property: '', room: row.room?._id || '', month: row.month, year: row.year, mode: row.mode, previousReading: row.previousReading || '', currentReading: row.currentReading || '', ratePerUnit: row.ratePerUnit || '', fixedCharge: row.fixedCharge || '', dueDate: row.dueDate ? row.dueDate.slice(0, 10) : '', status: row.status });
    setEditing(row._id); setModal('form');
  };

  const statusColor = { unpaid: 'red', paid: 'green', partial: 'amber' };

  const columns = [
    { key: 'tenant', label: t('col.tenant'), render: (r) => r.tenant?.name || '—' },
    { key: 'room', label: t('col.room'), render: (r) => r.room?.roomNumber || '—' },
    { key: 'period', label: t('col.period'), render: (r) => `${months[(r.month || 1) - 1]} ${r.year}` },
    { key: 'mode', label: t('col.mode'), render: (r) => r.mode ? t(`enum.${r.mode}`) : '—' },
    { key: 'amount', label: t('col.amount'), render: (r) => r.amount ? `₹${r.amount}` : '—' },
    { key: 'dueDate', label: t('col.dueDate'), render: (r) => r.dueDate ? new Date(r.dueDate).toLocaleDateString() : '—' },
    { key: 'status', label: t('col.status'), render: (r) => <Badge label={r.status ? t(`enum.${r.status}`) : '—'} variant={statusColor[r.status]} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="text-sm text-slate-500 shrink-0">{elecPagination?.total ?? data?.length ?? 0} {t('col.bills')}</p>
        <div className="flex-1"><SearchBar value={searchInput} onChange={setSearchInput} placeholder={t('search.tenantMobile')} /></div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors shrink-0">
          <Plus size={16} /> {t('electricity.addBill')}
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
            totalPages={elecPagination?.totalPages ?? 1}
            onPageChange={setPage}
            itemsPerPage={limit}
            onItemsPerPageChange={setLimit}
            totalItems={elecPagination?.total}
          />
        </>
      )}

      {modal === 'form' && (
        <Modal title={editing ? t('electricity.editBill') : t('electricity.addBill')} onClose={() => setModal(null)}>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }} className="space-y-4">
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.month')}</label>
                <select required value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">{t('common.month')}</option>
                  {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.year')}</label>
                <input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('electricity.mode')}</label>
              <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="meter">{t('electricity.meter')}</option>
                <option value="fixed">{t('electricity.fixed')}</option>
              </select>
            </div>
            {form.mode === 'meter' ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('electricity.previousReading')}</label>
                    <input type="number" required value={form.previousReading} onChange={(e) => setForm({ ...form, previousReading: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('electricity.currentReading')}</label>
                    <input type="number" required value={form.currentReading} onChange={(e) => setForm({ ...form, currentReading: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('electricity.ratePerUnit')}</label>
                  <input type="number" required value={form.ratePerUnit} onChange={(e) => setForm({ ...form, ratePerUnit: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('electricity.fixedCharge')}</label>
                <input type="number" required value={form.fixedCharge} onChange={(e) => setForm({ ...form, fixedCharge: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.dueDate')}</label>
              <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
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
