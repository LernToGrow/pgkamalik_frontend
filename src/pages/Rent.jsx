import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, CreditCard, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import SearchBar from '../components/ui/SearchBar';
import { useProperty } from '../context/PropertyContext';

const statusColor = { paid: 'green', pending: 'amber', overdue: 'red', partial: 'blue' };
const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const empty = { tenant: '', property: '', month: '', year: new Date().getFullYear(), rentAmount: '', dueDate: '' };

export default function Rent() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [payModal, setPayModal] = useState(null);
  const [payForm, setPayForm] = useState({ paidAmount: '', paymentMode: 'cash', paidDate: '' });
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

  const { data: rentData, isLoading } = useQuery({
    queryKey: ['rent', page, limit, search, propertyId],
    queryFn: () => api.get('/rent', { params: { page, limit, ...(search && { search }), ...(propertyId && { propertyId }) } }).then((r) => r.data),
  });

  const records = rentData?.data?.records;
  const rentPagination = rentData?.pagination;

  const { data: tenants } = useQuery({ queryKey: ['tenants'], queryFn: () => api.get('/tenants', { params: { limit: 100 } }).then((r) => r.data.data.tenants) });
  const { data: properties } = useQuery({ queryKey: ['properties'], queryFn: () => api.get('/properties', { params: { limit: 100 } }).then((r) => r.data.data.properties) });

  const save = useMutation({
    mutationFn: (d) => editing ? api.put(`/rent/${editing}`, d) : api.post('/rent', { ...d, totalAmount: Number(d.rentAmount) }),
    onSuccess: () => { qc.invalidateQueries(['rent']); setModal(null); toast.success(t('toast.saved')); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  const markPaid = useMutation({
    mutationFn: ({ id, data }) => api.patch(`/rent/${id}/pay`, data),
    onSuccess: () => { qc.invalidateQueries(['rent']); setPayModal(null); toast.success(t('toast.saved')); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  const downloadReceipt = async (id, row) => {
    try {
      const res = await api.get(`/rent/${id}/receipt`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${months[(row.month || 1) - 1]}-${row.year}-${(row.tenant?.name || 'tenant').replace(/\s+/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download receipt');
    }
  };

  const openAdd = () => { setForm(empty); setEditing(null); setModal('form'); };
  const openEdit = (row) => {
    setForm({ tenant: row.tenant?._id || '', property: row.property?._id || '', month: row.month, year: row.year, rentAmount: row.rentAmount, dueDate: row.dueDate?.slice(0, 10) || '' });
    setEditing(row._id); setModal('form');
  };

  const columns = [
    { key: 'tenant', label: t('col.tenant'), render: (r) => r.tenant?.name || '—' },
    { key: 'property', label: t('col.property'), render: (r) => r.property?.name || '—' },
    { key: 'period', label: t('col.period'), render: (r) => `${months[(r.month || 1) - 1]} ${r.year}` },
    { key: 'rentAmount', label: t('col.rent'), render: (r) => `₹${r.rentAmount}` },
    { key: 'totalAmount', label: t('col.total'), render: (r) => `₹${r.totalAmount || r.rentAmount}` },
    { key: 'status', label: t('col.status'), render: (r) => <Badge label={r.status ? t(`enum.${r.status}`) : '—'} variant={statusColor[r.status]} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="text-sm text-slate-500 shrink-0">{rentPagination?.total ?? records?.length ?? 0} {t('col.records')}</p>
        <div className="flex-1"><SearchBar value={searchInput} onChange={setSearchInput} placeholder={t('search.tenantMobile')} /></div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors shrink-0">
          <Plus size={16} /> {t('rent.addRecord')}
        </button>
      </div>

      {isLoading ? <div className="h-40 bg-white rounded-xl border border-slate-200 animate-pulse" /> : (
        <>
          <Table columns={columns} data={records || []}
            actions={(row) => (
              <div className="flex gap-2">
                <button onClick={() => openEdit(row)} className="text-slate-400 hover:text-indigo-600"><Pencil size={15} /></button>
                {row.status !== 'paid' && (
                  <button onClick={() => { setPayModal(row._id); setPayForm({ paidAmount: row.totalAmount || row.rentAmount, paymentMode: 'cash', paidDate: new Date().toISOString().slice(0, 10) }); }}
                    className="text-slate-400 hover:text-green-600" title="Mark Paid"><CreditCard size={15} /></button>
                )}
                {(row.status === 'paid' || row.status === 'partial') && (
                  <button onClick={() => downloadReceipt(row._id, row)} className="text-slate-400 hover:text-indigo-600" title="Download Receipt"><FileText size={15} /></button>
                )}
              </div>
            )}
          />
          <Pagination
            currentPage={page}
            totalPages={rentPagination?.totalPages ?? 1}
            onPageChange={setPage}
            itemsPerPage={limit}
            onItemsPerPageChange={setLimit}
            totalItems={rentPagination?.total}
          />
        </>
      )}

      {modal === 'form' && (
        <Modal title={editing ? t('rent.editRecord') : t('rent.addRecord')} onClose={() => setModal(null)}>
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
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('rent.rentAmount')}</label>
              <input type="number" required value={form.rentAmount} onChange={(e) => setForm({ ...form, rentAmount: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.dueDate')}</label>
              <input type="date" required value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
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

      {payModal && (
        <Modal title={t('rent.recordPayment')} onClose={() => setPayModal(null)}>
          <form onSubmit={(e) => { e.preventDefault(); markPaid.mutate({ id: payModal, data: payForm }); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('rent.amountPaid')}</label>
              <input type="number" required value={payForm.paidAmount} onChange={(e) => setPayForm({ ...payForm, paidAmount: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.paymentMode')}</label>
              <select value={payForm.paymentMode} onChange={(e) => setPayForm({ ...payForm, paymentMode: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {['cash', 'upi', 'bank_transfer', 'cheque'].map((m) => <option key={m} value={m}>{t(`enum.${m}`)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('rent.paidDate')}</label>
              <input type="date" value={payForm.paidDate} onChange={(e) => setPayForm({ ...payForm, paidDate: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setPayModal(null)} className="flex-1 border border-slate-300 text-slate-700 py-2 rounded-lg text-sm hover:bg-slate-50">{t('common.cancel')}</button>
              <button type="submit" disabled={markPaid.isPending} className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-60">
                {markPaid.isPending ? t('common.saving') : t('rent.recordPayment')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
