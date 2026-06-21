import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';

const typeColor = { general: 'blue', urgent: 'red', maintenance: 'amber', event: 'green' };
const empty = { property: '', title: '', message: '', type: 'general', expiresAt: '' };

export default function Notices() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['notices'],
    queryFn: () => api.get('/notices').then((r) => r.data.data.notices),
  });

  const { data: properties } = useQuery({ queryKey: ['properties'], queryFn: () => api.get('/properties', { params: { limit: 100 } }).then((r) => r.data.data.properties) });

  const save = useMutation({
    mutationFn: (d) => editing ? api.put(`/notices/${editing}`, d) : api.post('/notices', d),
    onSuccess: () => { qc.invalidateQueries(['notices']); setModal(null); toast.success(t('toast.saved')); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/notices/${id}`),
    onSuccess: () => { qc.invalidateQueries(['notices']); toast.success(t('toast.deleted')); },
  });

  const openAdd = () => { setForm(empty); setEditing(null); setModal('form'); };
  const openEdit = (row) => {
    setForm({ property: row.property?._id || row.property || '', title: row.title, message: row.message || '', type: row.type, expiresAt: row.expiresAt?.slice(0, 10) || '' });
    setEditing(row._id); setModal('form');
  };

  const columns = [
    { key: 'title', label: t('col.title') },
    { key: 'type', label: t('col.type'), render: (r) => <Badge label={r.type ? t(`enum.${r.type}`) : '—'} variant={typeColor[r.type]} /> },
    { key: 'sentAt', label: t('col.posted'), render: (r) => r.sentAt ? new Date(r.sentAt).toLocaleDateString() : '—' },
    { key: 'expiresAt', label: t('col.expires'), render: (r) => r.expiresAt ? new Date(r.expiresAt).toLocaleDateString() : '—' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">{data?.length || 0} {t('col.notices')}</p>
        <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors">
          <Plus size={16} /> {t('notices.postNotice')}
        </button>
      </div>

      {isLoading ? <div className="h-40 bg-white rounded-xl border border-slate-200 animate-pulse" /> : (
        <Table columns={columns} data={data || []}
          actions={(row) => (
            <div className="flex gap-2">
              <button onClick={() => openEdit(row)} className="text-slate-400 hover:text-indigo-600"><Pencil size={15} /></button>
              <button onClick={() => { if (confirm(t('confirm.delete'))) remove.mutate(row._id); }} className="text-slate-400 hover:text-red-600"><Trash2 size={15} /></button>
            </div>
          )}
        />
      )}

      {modal === 'form' && (
        <Modal title={editing ? t('notices.editNotice') : t('notices.postNotice')} onClose={() => setModal(null)}>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.property')}</label>
              <select required value={form.property} onChange={(e) => setForm({ ...form, property: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">{t('common.selectProperty')}</option>
                {(properties || []).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('notices.title')}</label>
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.type')}</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {['general', 'urgent', 'maintenance', 'event'].map((type) => <option key={type} value={type}>{t(`enum.${type}`)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('notices.message')}</label>
              <textarea required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={4}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('notices.expiresAt')}</label>
              <input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
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

