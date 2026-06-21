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

const bedStatusColor = { vacant: 'green', occupied: 'red', reserved: 'amber', maintenance: 'slate' };
const empty = { propertyId: '', roomNumber: '', floor: 1, type: 'single', rent: '', attachedBath: false, hasAC: false, bedLabels: 'A' };

export default function Rooms() {
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

  const { data: roomsData, isLoading } = useQuery({
    queryKey: ['rooms', page, limit, search, propertyId],
    queryFn: () => api.get('/rooms', { params: { page, limit, ...(search && { search }), ...(propertyId && { propertyId }) } }).then((r) => r.data),
  });

  const rooms = roomsData?.data?.rooms;
  const pagination = roomsData?.pagination;

  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: () => api.get('/properties', { params: { limit: 100 } }).then((r) => r.data.data.properties),
  });

  const save = useMutation({
    mutationFn: (d) => {
      if (editing) {
        return api.put(`/rooms/${editing}`, { roomNumber: d.roomNumber, floor: d.floor, type: d.type, rent: d.rent, attachedBath: d.attachedBath, hasAC: d.hasAC });
      }
      const bedLabels = d.bedLabels ? d.bedLabels.split(',').map((s) => s.trim()).filter(Boolean) : ['A'];
      return api.post('/rooms', { ...d, bedLabels });
    },
    onSuccess: () => { qc.invalidateQueries(['rooms']); setModal(null); toast.success(t('toast.saved')); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/rooms/${id}`),
    onSuccess: () => { qc.invalidateQueries(['rooms']); toast.success(t('toast.deleted')); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  const openAdd = () => { setForm(empty); setEditing(null); setModal('form'); };
  const openEdit = (row) => {
    setForm({ propertyId: row.property?._id || '', roomNumber: row.roomNumber, floor: row.floor, type: row.type, rent: row.rent, attachedBath: row.attachedBath, hasAC: row.hasAC, bedLabels: (row.beds || []).map((b) => b.label).join(', ') });
    setEditing(row._id); setModal('form');
  };

  const columns = [
    { key: 'roomNumber', label: t('col.roomNo') },
    { key: 'property', label: t('col.property'), render: (r) => r.property?.name || '—' },
    { key: 'type', label: t('col.type'), render: (r) => r.type ? t(`enum.${r.type}`) : '—' },
    { key: 'rent', label: t('col.rent'), render: (r) => `₹${r.rent}` },
    { key: 'beds', label: t('col.beds'), render: (r) => (
      <div className="flex gap-1 flex-wrap">
        {(r.beds || []).map((b) => (
          <span key={b._id} className="text-xs px-1.5 py-0.5 rounded border border-slate-200">
            {b.label}: <Badge label={t(`enum.${b.status}`)} variant={bedStatusColor[b.status]} />
          </span>
        ))}
      </div>
    )},
    { key: 'attachedBath', label: t('col.bath'), render: (r) => r.attachedBath ? '✓' : '—' },
    { key: 'hasAC', label: t('col.ac'), render: (r) => r.hasAC ? '✓' : '—' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="text-sm text-slate-500 shrink-0">{pagination?.total ?? rooms?.length ?? 0} {t('col.rooms')}</p>
        <div className="flex-1"><SearchBar value={searchInput} onChange={setSearchInput} placeholder={t('search.roomNumber')} /></div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors shrink-0">
          <Plus size={16} /> {t('rooms.addRoom')}
        </button>
      </div>

      {isLoading ? <div className="h-40 bg-white rounded-xl border border-slate-200 animate-pulse" /> : (
        <>
          <Table columns={columns} data={rooms || []}
            actions={(row) => (
              <div className="flex gap-2">
                <button onClick={() => openEdit(row)} className="text-slate-400 hover:text-indigo-600"><Pencil size={15} /></button>
                <button onClick={() => { if (confirm(t('confirm.delete'))) remove.mutate(row._id); }} className="text-slate-400 hover:text-red-600"><Trash2 size={15} /></button>
              </div>
            )}
          />
          <Pagination
            currentPage={page}
            totalPages={pagination?.totalPages ?? 1}
            onPageChange={setPage}
            itemsPerPage={limit}
            onItemsPerPageChange={setLimit}
            totalItems={pagination?.total}
          />
        </>
      )}

      {modal === 'form' && (
        <Modal title={editing ? t('rooms.editRoom') : t('rooms.addRoom')} onClose={() => setModal(null)}>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }} className="space-y-4">
            {!editing && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.property')}</label>
                <select required value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">{t('common.selectProperty')}</option>
                  {(properties || []).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('rooms.roomNumber')}</label>
              <input required value={form.roomNumber} onChange={(e) => setForm({ ...form, roomNumber: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.floor')}</label>
                <input type="number" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('rooms.rent')}</label>
                <input type="number" required value={form.rent} onChange={(e) => setForm({ ...form, rent: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.type')}</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {['single', 'double', 'triple', 'dormitory'].map((type) => <option key={type} value={type}>{t(`enum.${type}`)}</option>)}
              </select>
            </div>
            {!editing && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('rooms.bedLabels')}</label>
                <input placeholder={t('rooms.bedLabelsPlaceholder')} value={form.bedLabels} onChange={(e) => setForm({ ...form, bedLabels: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            )}
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={form.attachedBath} onChange={(e) => setForm({ ...form, attachedBath: e.target.checked })} />
                {t('rooms.attachedBathroom')}
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={form.hasAC} onChange={(e) => setForm({ ...form, hasAC: e.target.checked })} />
                {t('rooms.airConditioning')}
              </label>
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
