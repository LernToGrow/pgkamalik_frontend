import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Undo2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import SearchBar from '../components/ui/SearchBar';
import { useProperty } from '../context/PropertyContext';

const statusColor = { held: 'blue', partial: 'amber', refunded: 'green' };
const paymentModes = ['cash', 'upi', 'bank_transfer', 'cheque'];
const empty = { tenant: '', property: '', depositAmount: '', depositDate: '', paymentMode: 'cash', notes: '' };

export default function Deposits() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [refundModal, setRefundModal] = useState(null);
  const [refundForm, setRefundForm] = useState({ refundAmount: '', refundDate: '' });
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

  const { data: depositsData, isLoading } = useQuery({
    queryKey: ['deposits', page, limit, search, propertyId],
    queryFn: () => api.get('/deposits', { params: { page, limit, ...(search && { search }), ...(propertyId && { propertyId }) } }).then((r) => r.data),
  });

  const data = depositsData?.data?.deposits;
  const depositsPagination = depositsData?.pagination;

  const { data: tenants } = useQuery({ queryKey: ['tenants'], queryFn: () => api.get('/tenants', { params: { limit: 100 } }).then((r) => r.data.data.tenants) });
  const { data: properties } = useQuery({ queryKey: ['properties'], queryFn: () => api.get('/properties', { params: { limit: 100 } }).then((r) => r.data.data.properties) });

  const save = useMutation({
    mutationFn: (d) => api.post('/deposits', d),
    onSuccess: () => { qc.invalidateQueries(['deposits']); setModal(null); toast.success(t('toast.saved')); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  const refund = useMutation({
    mutationFn: ({ id, data }) => api.patch(`/deposits/${id}/refund`, data),
    onSuccess: () => { qc.invalidateQueries(['deposits']); setRefundModal(null); toast.success(t('toast.saved')); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  const columns = [
    { key: 'tenant', label: t('col.tenant'), render: (r) => r.tenant?.name || '—' },
    { key: 'depositAmount', label: t('col.deposit'), render: (r) => `₹${r.depositAmount}` },
    { key: 'refundAmount', label: t('col.refundable'), render: (r) => `₹${r.refundAmount ?? r.depositAmount}` },
    { key: 'depositDate', label: t('col.date'), render: (r) => r.depositDate ? new Date(r.depositDate).toLocaleDateString() : '—' },
    { key: 'refundStatus', label: t('col.status'), render: (r) => <Badge label={t(`enum.${r.refundStatus || 'held'}`)} variant={statusColor[r.refundStatus || 'held']} /> },
    { key: 'paymentMode', label: t('col.mode'), render: (r) => t(`enum.${r.paymentMode || 'cash'}`) },
    { key: 'refundDate', label: t('col.refundDate'), render: (r) => r.refundDate ? new Date(r.refundDate).toLocaleDateString() : '—' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="text-sm text-slate-500 shrink-0">{depositsPagination?.total ?? data?.length ?? 0} {t('col.deposits')}</p>
        <div className="flex-1"><SearchBar value={searchInput} onChange={setSearchInput} placeholder={t('search.tenantMobile')} /></div>
        <button onClick={() => { setForm(empty); setModal('form'); }} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors shrink-0">
          <Plus size={16} /> {t('deposits.addDeposit')}
        </button>
      </div>

      {isLoading ? <div className="h-40 bg-white rounded-xl border border-slate-200 animate-pulse" /> : (
        <>
          <Table columns={columns} data={data || []}
            actions={(row) => (
              row.refundStatus !== 'refunded' ? (
                <button onClick={() => { setRefundModal(row._id); setRefundForm({ refundAmount: row.refundAmount ?? row.depositAmount, refundDate: new Date().toISOString().slice(0, 10) }); }}
                  className="text-slate-400 hover:text-green-600" title="Process Refund"><Undo2 size={15} /></button>
              ) : null
            )}
          />
          <Pagination
            currentPage={page}
            totalPages={depositsPagination?.totalPages ?? 1}
            onPageChange={setPage}
            itemsPerPage={limit}
            onItemsPerPageChange={setLimit}
            totalItems={depositsPagination?.total}
          />
        </>
      )}

      {modal === 'form' && (
        <Modal title={t('deposits.addDeposit')} onClose={() => setModal(null)}>
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
              <select required value={form.property} onChange={(e) => setForm({ ...form, property: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">{t('common.selectProperty')}</option>
                {(properties || []).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('deposits.depositAmount')}</label>
              <input type="number" required value={form.depositAmount} onChange={(e) => setForm({ ...form, depositAmount: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('deposits.depositDate')}</label>
              <input type="date" required value={form.depositDate} onChange={(e) => setForm({ ...form, depositDate: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.paymentMode')}</label>
              <select value={form.paymentMode} onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {paymentModes.map((m) => <option key={m} value={m}>{t(`enum.${m}`)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.notes')}</label>
              <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder={t('deposits.optionalNotes')} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
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

      {refundModal && (
        <Modal title={t('deposits.processRefund')} onClose={() => setRefundModal(null)}>
          <form onSubmit={(e) => { e.preventDefault(); refund.mutate({ id: refundModal, data: refundForm }); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('deposits.refundAmount')}</label>
              <input type="number" required value={refundForm.refundAmount} onChange={(e) => setRefundForm({ ...refundForm, refundAmount: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('deposits.refundDate')}</label>
              <input type="date" value={refundForm.refundDate} onChange={(e) => setRefundForm({ ...refundForm, refundDate: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setRefundModal(null)} className="flex-1 border border-slate-300 text-slate-700 py-2 rounded-lg text-sm hover:bg-slate-50">{t('common.cancel')}</button>
              <button type="submit" disabled={refund.isPending} className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-60">
                {refund.isPending ? t('deposits.processing') : t('deposits.processRefund')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}


