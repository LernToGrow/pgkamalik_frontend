import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import Pagination from '../components/ui/Pagination';
import SearchBar from '../components/ui/SearchBar';
import { useProperty } from '../context/PropertyContext';

const empty = { visitorName: '', visitorMobile: '', purpose: '', property: '', tenant: '' };

export default function Visitors() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
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

  const { data: visitorsData, isLoading } = useQuery({
    queryKey: ['visitors', page, limit, search, propertyId],
    queryFn: () => api.get('/visitors', { params: { page, limit, ...(search && { search }), ...(propertyId && { propertyId }) } }).then((r) => r.data),
  });

  const data = visitorsData?.data?.visitors;
  const visitorsPagination = visitorsData?.pagination;

  const { data: tenants } = useQuery({ queryKey: ['tenants'], queryFn: () => api.get('/tenants', { params: { limit: 100 } }).then((r) => r.data.data.tenants) });
  const { data: properties } = useQuery({ queryKey: ['properties'], queryFn: () => api.get('/properties', { params: { limit: 100 } }).then((r) => r.data.data.properties) });

  const logEntry = useMutation({
    mutationFn: (d) => api.post('/visitors', d),
    onSuccess: () => { qc.invalidateQueries(['visitors']); setModal(false); toast.success('Entry logged'); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  const logExit = useMutation({
    mutationFn: (id) => api.patch(`/visitors/${id}/checkout`),
    onSuccess: () => { qc.invalidateQueries(['visitors']); toast.success('Exit logged'); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  const columns = [
    { key: 'visitorName', label: t('col.visitorName') },
    { key: 'visitorMobile', label: t('col.mobile') },
    { key: 'purpose', label: t('col.purpose') },
    { key: 'tenant', label: t('col.visiting'), render: (r) => r.tenant?.name || '—' },
    { key: 'inTime', label: t('col.inTime'), render: (r) => r.inTime ? new Date(r.inTime).toLocaleString() : '—' },
    { key: 'outTime', label: t('col.outTime'), render: (r) => r.outTime ? new Date(r.outTime).toLocaleString() : <span className="text-amber-500 text-xs">{t('col.stillInside')}</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="text-sm text-slate-500 shrink-0">{visitorsPagination?.total ?? data?.length ?? 0} {t('col.visitors')}</p>
        <div className="flex-1"><SearchBar value={searchInput} onChange={setSearchInput} placeholder={t('search.nameMobile')} /></div>
        <button onClick={() => { setForm(empty); setModal(true); }} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors shrink-0">
          <Plus size={16} /> {t('visitors.logEntry')}
        </button>
      </div>

      {isLoading ? <div className="h-40 bg-white rounded-xl border border-slate-200 animate-pulse" /> : (
        <>
          <Table columns={columns} data={data || []}
            actions={(row) => (
              !row.outTime ? (
                <button onClick={() => { if (confirm(t('confirm.logExit'))) logExit.mutate(row._id); }} className="text-slate-400 hover:text-amber-600" title="Log Exit">
                  <LogOut size={15} />
                </button>
              ) : null
            )}
          />
          <Pagination
            currentPage={page}
            totalPages={visitorsPagination?.totalPages ?? 1}
            onPageChange={setPage}
            itemsPerPage={limit}
            onItemsPerPageChange={setLimit}
            totalItems={visitorsPagination?.total}
          />
        </>
      )}

      {modal && (
        <Modal title={t('visitors.logVisitorEntry')} onClose={() => setModal(false)}>
          <form onSubmit={(e) => { e.preventDefault(); logEntry.mutate(form); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('visitors.visitorName')}</label>
              <input required value={form.visitorName} onChange={(e) => setForm({ ...form, visitorName: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.mobile')}</label>
              <input value={form.visitorMobile} onChange={(e) => setForm({ ...form, visitorMobile: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('visitors.purpose')}</label>
              <input value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })}
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
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('visitors.visitingTenant')}</label>
              <select required value={form.tenant} onChange={(e) => setForm({ ...form, tenant: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">{t('common.selectTenant')}</option>
                {(tenants || []).map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModal(false)} className="flex-1 border border-slate-300 text-slate-700 py-2 rounded-lg text-sm hover:bg-slate-50">{t('common.cancel')}</button>
              <button type="submit" disabled={logEntry.isPending} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-60">
                {logEntry.isPending ? t('common.saving') : t('visitors.logEntry')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
