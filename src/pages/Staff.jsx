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

const roles = ['caretaker', 'security', 'cleaner', 'cook', 'other'];
const empty = { name: '', mobile: '', role: 'cleaner', salary: '', joinDate: '', property: '' };

export default function Staff() {
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

  const { data: staffData, isLoading } = useQuery({
    queryKey: ['staff', page, limit, search, propertyId],
    queryFn: () => api.get('/staff', { params: { page, limit, ...(search && { search }), ...(propertyId && { propertyId }) } }).then((r) => r.data),
  });

  const data = staffData?.data?.staff;
  const staffPagination = staffData?.pagination;

  const { data: properties } = useQuery({ queryKey: ['properties'], queryFn: () => api.get('/properties', { params: { limit: 100 } }).then((r) => r.data.data.properties) });

  const save = useMutation({
    mutationFn: (d) => editing ? api.put(`/staff/${editing}`, d) : api.post('/staff', d),
    onSuccess: () => { qc.invalidateQueries(['staff']); setModal(null); toast.success(t('toast.saved')); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  const remove = useMutation({
    mutationFn: (id) => api.patch(`/staff/${id}/remove`),
    onSuccess: () => { qc.invalidateQueries(['staff']); toast.success(t('toast.removed')); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  const openAdd = () => { setForm(empty); setEditing(null); setModal('form'); };
  const openEdit = (row) => {
    setForm({ name: row.name, mobile: row.mobile, role: row.role, salary: row.salary, joinDate: row.joinDate?.slice(0, 10) || '', property: row.property?._id || row.property || '' });
    setEditing(row._id); setModal('form');
  };

  const columns = [
    { key: 'name', label: t('col.name') },
    { key: 'role', label: t('col.role'), render: (r) => r.role ? t(`enum.${r.role}`) : '—' },
    { key: 'mobile', label: t('col.mobile') },
    { key: 'salary', label: t('col.salary'), render: (r) => `₹${r.salary}` },
    { key: 'joinDate', label: t('col.joinDate'), render: (r) => r.joinDate ? new Date(r.joinDate).toLocaleDateString() : '—' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="text-sm text-slate-500 shrink-0">{staffPagination?.total ?? data?.length ?? 0} {t('col.staffMembers')}</p>
        <div className="flex-1"><SearchBar value={searchInput} onChange={setSearchInput} placeholder={t('search.tenantName')} /></div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors shrink-0">
          <Plus size={16} /> {t('staff.addStaff')}
        </button>
      </div>

      {isLoading ? <div className="h-40 bg-white rounded-xl border border-slate-200 animate-pulse" /> : (
        <>
          <Table columns={columns} data={data || []}
            actions={(row) => (
              <div className="flex gap-2">
                <button onClick={() => openEdit(row)} className="text-slate-400 hover:text-indigo-600"><Pencil size={15} /></button>
                <button onClick={() => { if (confirm(t('confirm.remove'))) remove.mutate(row._id); }} className="text-slate-400 hover:text-red-600"><Trash2 size={15} /></button>
              </div>
            )}
          />
          <Pagination
            currentPage={page}
            totalPages={staffPagination?.totalPages ?? 1}
            onPageChange={setPage}
            itemsPerPage={limit}
            onItemsPerPageChange={setLimit}
            totalItems={staffPagination?.total}
          />
        </>
      )}

      {modal === 'form' && (
        <Modal title={editing ? t('staff.editStaff') : t('staff.addStaff')} onClose={() => setModal(null)}>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('tenants.fullName')}</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.mobile')}</label>
              <input required value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('staff.role')}</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {roles.map((r) => <option key={r} value={r}>{t(`enum.${r}`)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('staff.salary')}</label>
              <input type="number" required value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('staff.joinDate')}</label>
              <input type="date" required value={form.joinDate} onChange={(e) => setForm({ ...form, joinDate: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.property')}</label>
              <select required value={form.property} onChange={(e) => setForm({ ...form, property: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">{t('common.selectProperty')}</option>
                {(properties || []).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
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
