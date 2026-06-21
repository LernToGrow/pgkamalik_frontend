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
import { useProperty } from '../context/PropertyContext';

const empty = { title: '', amount: '', category: 'miscellaneous', date: '', description: '', property: '' };
const categories = ['electricity', 'staff_salary', 'cleaning', 'internet', 'repairs', 'food', 'miscellaneous'];

export default function Expenses() {
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

  const { data: expensesData, isLoading } = useQuery({
    queryKey: ['expenses', page, limit, search, propertyId],
    queryFn: () => api.get('/expenses', { params: { page, limit, ...(search && { search }), ...(propertyId && { propertyId }) } }).then((r) => r.data),
  });

  const data = expensesData?.data?.expenses;
  const expensesPagination = expensesData?.pagination;

  const { data: properties } = useQuery({ queryKey: ['properties'], queryFn: () => api.get('/properties', { params: { limit: 100 } }).then((r) => r.data.data.properties) });

  const save = useMutation({
    mutationFn: (d) => editing ? api.put(`/expenses/${editing}`, d) : api.post('/expenses', d),
    onSuccess: () => { qc.invalidateQueries(['expenses']); setModal(null); toast.success(t('toast.saved')); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/expenses/${id}`),
    onSuccess: () => { qc.invalidateQueries(['expenses']); toast.success(t('toast.deleted')); },
  });

  const openAdd = () => { setForm(empty); setEditing(null); setModal('form'); };
  const openEdit = (row) => {
    setForm({ title: row.title, amount: row.amount, category: row.category, date: row.date?.slice(0, 10) || '', description: row.description || '', property: row.property?._id || '' });
    setEditing(row._id); setModal('form');
  };

  const columns = [
    { key: 'title', label: t('col.title') },
    { key: 'category', label: t('col.category') },
    { key: 'amount', label: t('col.amount'), render: (r) => `₹${r.amount}` },
    { key: 'date', label: t('col.date'), render: (r) => r.date ? new Date(r.date).toLocaleDateString() : '—' },
    { key: 'property', label: t('col.property'), render: (r) => r.property?.name || '—' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="text-sm text-slate-500 shrink-0">{expensesPagination?.total ?? data?.length ?? 0} {t('col.expenses')}</p>
        <div className="flex-1"><SearchBar value={searchInput} onChange={setSearchInput} placeholder={t('search.titleCategory')} /></div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors shrink-0">
          <Plus size={16} /> {t('expenses.addExpense')}
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
            totalPages={expensesPagination?.totalPages ?? 1}
            onPageChange={setPage}
            itemsPerPage={limit}
            onItemsPerPageChange={setLimit}
            totalItems={expensesPagination?.total}
          />
        </>
      )}

      {modal === 'form' && (
        <Modal title={editing ? t('expenses.editExpense') : t('expenses.addExpense')} onClose={() => setModal(null)}>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('expenses.title')}</label>
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('expenses.category')}</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {categories.map((c) => <option key={c} value={c}>{t(`enum.${c}`)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('expenses.amount')}</label>
              <input type="number" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.date')}</label>
              <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.property')}</label>
              <select value={form.property} onChange={(e) => setForm({ ...form, property: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">{t('common.selectProperty')}</option>
                {(properties || []).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.description')}</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
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

