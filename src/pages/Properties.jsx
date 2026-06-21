import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import Pagination from '../components/ui/Pagination';
import SearchBar from '../components/ui/SearchBar';

const empty = { name: '', address: '', city: '', totalFloors: 1, electricityMode: 'fixed', rentDueDay: 10 };

export default function Properties() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data: propsData, isLoading } = useQuery({
    queryKey: ['properties', page, limit, search],
    queryFn: () => api.get('/properties', { params: { page, limit, ...(search && { search }) } }).then((r) => r.data),
  });

  const data = propsData?.data?.properties;
  const propsPagination = propsData?.pagination;

  const save = useMutation({
    mutationFn: (d) => editing ? api.put(`/properties/${editing}`, d) : api.post('/properties', d),
    onSuccess: () => { qc.invalidateQueries(['properties']); setModal(null); toast.success(t('toast.saved')); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/properties/${id}`),
    onSuccess: () => { qc.invalidateQueries(['properties']); toast.success(t('toast.deleted')); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  const openAdd = () => { setForm(empty); setEditing(null); setModal('form'); };
  const openEdit = (row) => { setForm({ name: row.name, address: row.address, city: row.city, totalFloors: row.totalFloors, electricityMode: row.electricityMode, rentDueDay: row.rentDueDay ?? 10 }); setEditing(row._id); setModal('form'); };

  const columns = [
    { key: 'name', label: t('col.name') },
    { key: 'address', label: t('col.address') },
    { key: 'city', label: t('col.city') },
    { key: 'totalFloors', label: t('col.floors') },
    { key: 'electricityMode', label: t('col.electricityMode'), render: (r) => r.electricityMode ? t(`enum.${r.electricityMode}`) : '—' },
    { key: 'rentDueDay', label: t('properties.rentDueDay'), render: (r) => r.rentDueDay ? `${r.rentDueDay}th` : '10th' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="text-sm text-slate-500 shrink-0">{propsPagination?.total ?? data?.length ?? 0} {t('col.properties')}</p>
        <div className="flex-1"><SearchBar value={searchInput} onChange={setSearchInput} placeholder={t('search.nameCity')} /></div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors shrink-0">
          <Plus size={16} /> {t('properties.addProperty')}
        </button>
      </div>

      {isLoading ? <div className="h-40 bg-white rounded-xl border border-slate-200 animate-pulse" /> : (
        <>
          <Table
            columns={columns}
            data={data || []}
            actions={(row) => (
              <div className="flex gap-2">
                <button onClick={() => openEdit(row)} className="text-slate-400 hover:text-indigo-600"><Pencil size={15} /></button>
                <button onClick={() => { if (confirm(t('confirm.delete'))) remove.mutate(row._id); }} className="text-slate-400 hover:text-red-600"><Trash2 size={15} /></button>
              </div>
            )}
          />
          <Pagination
            currentPage={page}
            totalPages={propsPagination?.totalPages ?? 1}
            onPageChange={setPage}
            itemsPerPage={limit}
            onItemsPerPageChange={setLimit}
            totalItems={propsPagination?.total}
          />
        </>
      )}

      {modal === 'form' && (
        <Modal title={editing ? t('properties.editProperty') : t('properties.addProperty')} onClose={() => setModal(null)}>
          <form onSubmit={(e) => {
            e.preventDefault();
            const day = Number(form.rentDueDay);
            if (!day || day < 1 || day > 28) { toast.error(t('properties.rentDueDayError')); return; }
            save.mutate(form);
          }} className="space-y-4">
            {[['name', t('common.name')], ['address', t('properties.address')], ['city', t('properties.city')]].map(([k, l]) => (
              <div key={k}>
                <label className="block text-sm font-medium text-slate-700 mb-1">{l}</label>
                <input required value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('properties.totalFloors')}</label>
              <input type="number" min="1" value={form.totalFloors} onChange={(e) => setForm({ ...form, totalFloors: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('properties.electricityMode')}</label>
              <select value={form.electricityMode} onChange={(e) => setForm({ ...form, electricityMode: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="fixed">{t('properties.fixed')}</option>
                <option value="meter">{t('properties.meter')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('properties.rentDueDay')}</label>
              <input type="number" min="1" max="28" value={form.rentDueDay} onChange={(e) => setForm({ ...form, rentDueDay: Number(e.target.value) })}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${form.rentDueDay < 1 || form.rentDueDay > 28 ? 'border-red-400' : 'border-slate-300'}`} />
              {(form.rentDueDay < 1 || form.rentDueDay > 28) && (
                <p className="text-xs text-red-500 mt-1">{t('properties.rentDueDayError')}</p>
              )}
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
