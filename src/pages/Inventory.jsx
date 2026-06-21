import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ChevronDown, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import SearchBar from '../components/ui/SearchBar';
import { useProperty } from '../context/PropertyContext';

const conditionColor = { good: 'green', damaged: 'red', missing: 'amber' };

export default function Inventory() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState({});
  const [modal, setModal] = useState(null);
  const [createForm, setCreateForm] = useState({ property: '', room: '' });
  const [assetForm, setAssetForm] = useState({ name: '', quantity: 1, condition: 'good' });
  const [targetId, setTargetId] = useState(null);
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

  const { data: inventoryData, isLoading } = useQuery({
    queryKey: ['inventory', page, limit, search, propertyId],
    queryFn: () => api.get('/inventory', { params: { page, limit, ...(search && { search }), ...(propertyId && { propertyId }) } }).then((r) => r.data),
  });

  const data = inventoryData?.data?.inventory;
  const inventoryPagination = inventoryData?.pagination;

  const { data: properties } = useQuery({ queryKey: ['properties'], queryFn: () => api.get('/properties', { params: { limit: 100 } }).then((r) => r.data.data.properties) });
  const { data: rooms } = useQuery({
    queryKey: ['rooms', createForm.property],
    queryFn: () => createForm.property ? api.get(`/rooms?propertyId=${createForm.property}&limit=100`).then((r) => r.data.data.rooms) : Promise.resolve([]),
    enabled: !!createForm.property,
  });

  const createRecord = useMutation({
    mutationFn: (d) => api.post('/inventory', d),
    onSuccess: () => { qc.invalidateQueries(['inventory']); setModal(null); toast.success(t('toast.created')); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  const upsertAsset = useMutation({
    mutationFn: ({ id, data }) => api.patch(`/inventory/${id}/asset`, data),
    onSuccess: () => { qc.invalidateQueries(['inventory']); setModal(null); toast.success(t('toast.assetSaved')); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  const removeAsset = useMutation({
    mutationFn: ({ id, assetId }) => api.delete(`/inventory/${id}/asset/${assetId}`),
    onSuccess: () => { qc.invalidateQueries(['inventory']); toast.success(t('toast.assetRemoved')); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  const toggle = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  if (isLoading) return <div className="h-40 bg-white rounded-xl border border-slate-200 animate-pulse" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="text-sm text-slate-500 shrink-0">{inventoryPagination?.total ?? data?.length ?? 0} {t('col.roomRecords')}</p>
        <div className="flex-1"><SearchBar value={searchInput} onChange={setSearchInput} placeholder={t('search.inventoryRoom')} /></div>
        <button onClick={() => { setCreateForm({ property: '', room: '' }); setModal('create'); }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors shrink-0">
          <Plus size={16} /> {t('inventory.addRoomInventory')}
        </button>
      </div>

      <div className="space-y-2">
        {(data || []).length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">{t('table.noInventory')}</div>
        )}
        {(data || []).map((inv) => (
          <div key={inv._id} className="bg-white rounded-xl border border-slate-200">
            <button onClick={() => toggle(inv._id)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3">
                {expanded[inv._id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <span className="font-medium text-slate-800">{t('col.room')} {inv.room?.roomNumber || '—'}</span>
                <span className="text-sm text-slate-400">{t('col.floor')} {inv.room?.floor}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">{inv.assets?.length || 0} {t('col.assets')}</span>
                <button onClick={(e) => { e.stopPropagation(); setTargetId(inv._id); setAssetForm({ name: '', quantity: 1, condition: 'good' }); setModal('asset'); }}
                  className="text-indigo-600 hover:text-indigo-800 text-xs font-medium">+ {t('inventory.addAsset')}</button>
              </div>
            </button>

            {expanded[inv._id] && (
              <div className="border-t border-slate-100 px-5 pb-4">
                {(inv.assets || []).length === 0 ? (
                  <p className="text-sm text-slate-400 py-3">{t('table.noAssets')}</p>
                ) : (
                  <table className="w-full text-sm mt-3">
                    <thead>
                      <tr className="text-left text-slate-500 border-b border-slate-100">
                        <th className="pb-2 font-medium">{t('col.asset')}</th>
                        <th className="pb-2 font-medium">{t('col.qty')}</th>
                        <th className="pb-2 font-medium">{t('col.condition')}</th>
                        <th className="pb-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {inv.assets.map((a) => (
                        <tr key={a._id} className="border-b border-slate-50 last:border-0">
                          <td className="py-2 text-slate-700">{a.name}</td>
                          <td className="py-2 text-slate-700">{a.quantity}</td>
                          <td className="py-2"><Badge label={a.condition ? t(`enum.${a.condition}`) : '—'} variant={conditionColor[a.condition]} /></td>
                          <td className="py-2">
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => { setTargetId(inv._id); setAssetForm({ name: a.name, quantity: a.quantity, condition: a.condition }); setModal('asset'); }}
                                className="text-slate-400 hover:text-indigo-600"><Pencil size={13} /></button>
                              <button onClick={() => { if (confirm(t('confirm.removeAsset'))) removeAsset.mutate({ id: inv._id, assetId: a._id }); }}
                                className="text-slate-400 hover:text-red-600"><Trash2 size={13} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <Pagination
        currentPage={page}
        totalPages={inventoryPagination?.totalPages ?? 1}
        onPageChange={setPage}
        itemsPerPage={limit}
        onItemsPerPageChange={setLimit}
        totalItems={inventoryPagination?.total}
      />

      {modal === 'create' && (
        <Modal title={t('inventory.addRoomInventory')} onClose={() => setModal(null)}>
          <form onSubmit={(e) => { e.preventDefault(); createRecord.mutate(createForm); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.property')}</label>
              <select required value={createForm.property} onChange={(e) => setCreateForm({ ...createForm, property: e.target.value, room: '' })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">{t('common.selectProperty')}</option>
                {(properties || []).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.room')}</label>
              <select required value={createForm.room} onChange={(e) => setCreateForm({ ...createForm, room: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">{t('common.selectRoom')}</option>
                {(rooms || []).map((r) => <option key={r._id} value={r._id}>{r.roomNumber}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)} className="flex-1 border border-slate-300 text-slate-700 py-2 rounded-lg text-sm hover:bg-slate-50">{t('common.cancel')}</button>
              <button type="submit" disabled={createRecord.isPending} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-60">
                {createRecord.isPending ? t('common.saving') : t('common.create')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === 'asset' && (
        <Modal title={t('inventory.addUpdateAsset')} onClose={() => setModal(null)}>
          <form onSubmit={(e) => { e.preventDefault(); upsertAsset.mutate({ id: targetId, data: assetForm }); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('inventory.assetName')}</label>
              <input required value={assetForm.name} onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('inventory.quantity')}</label>
              <input type="number" min="1" value={assetForm.quantity} onChange={(e) => setAssetForm({ ...assetForm, quantity: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('inventory.condition')}</label>
              <select value={assetForm.condition} onChange={(e) => setAssetForm({ ...assetForm, condition: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {['good', 'damaged', 'missing'].map((c) => <option key={c} value={c}>{t(`enum.${c}`)}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)} className="flex-1 border border-slate-300 text-slate-700 py-2 rounded-lg text-sm hover:bg-slate-50">{t('common.cancel')}</button>
              <button type="submit" disabled={upsertAsset.isPending} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-60">
                {upsertAsset.isPending ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

