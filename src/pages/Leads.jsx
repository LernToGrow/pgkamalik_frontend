import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, ExternalLink, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/ui/Pagination';
import SearchBar from '../components/ui/SearchBar';
import { useProperty } from '../context/PropertyContext';

const STATUS_COLORS = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-amber-100 text-amber-700',
  converted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const statusOptions = ['new', 'contacted', 'converted', 'rejected'];

export default function Leads() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState('all');
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

  const vacancyUrl = `${window.location.origin}/vacancies/${user?.id}`;

  const { data: leadsData, isLoading } = useQuery({
    queryKey: ['leads', filter, page, limit, search, propertyId],
    queryFn: () => api.get('/leads', { params: { page, limit, ...(filter !== 'all' && { status: filter }), ...(search && { search }), ...(propertyId && { propertyId }) } }).then((r) => r.data),
  });

  const leads = leadsData?.data?.leads ?? [];
  const leadsPagination = leadsData?.pagination;

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/leads/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries(['leads']),
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/leads/${id}`),
    onSuccess: () => { qc.invalidateQueries(['leads']); toast.success(t('leads.leadDeleted')); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  const copyLink = () => {
    navigator.clipboard.writeText(vacancyUrl);
    toast.success(t('leads.linkCopied'));
  };

  return (
    <div className="p-6 space-y-6">
      {/* Vacancy link banner */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-indigo-900 text-base">🔗 {t('leads.vacancyPage')}</h2>
          <p className="text-sm text-indigo-600 mt-0.5">{t('leads.vacancyDesc')}</p>
          <p className="text-xs text-slate-500 mt-1 font-mono break-all">{vacancyUrl}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={copyLink} className="flex items-center gap-1.5 bg-white border border-indigo-200 text-indigo-700 font-semibold text-sm px-4 py-2 rounded-xl hover:bg-indigo-50 transition">
            <Copy size={14} /> {t('leads.copyLink')}
          </button>
          <a href={vacancyUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 bg-indigo-600 text-white font-semibold text-sm px-4 py-2 rounded-xl hover:bg-indigo-700 transition">
            <ExternalLink size={14} /> {t('leads.preview')}
          </a>
        </div>
      </div>

      {/* Filter tabs + search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {['all', ...statusOptions].map((s) => (
            <button
              key={s}
              onClick={() => { setFilter(s); setPage(1); }}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition ${filter === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
            >
              {s === 'all' ? t('leads.filterAll') : t(`enum.${s}`)}
              {s === 'all' && leadsPagination && <span className="ml-1.5 text-xs opacity-70">({leadsPagination.total})</span>}
            </button>
          ))}
        </div>
        <div className="sm:w-64"><SearchBar value={searchInput} onChange={setSearchInput} placeholder={t('search.nameMobileLeads')} /></div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-slate-400">{t('common.saving').replace('…', '')}…</div>
        ) : leads.length === 0 ? (
          <div className="p-10 text-center text-slate-400">{t('leads.noLeads')}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wide">
              <tr>
                <th className="px-5 py-3 text-left">{t('col.name')}</th>
                <th className="px-5 py-3 text-left">{t('col.mobile')}</th>
                <th className="px-5 py-3 text-left">{t('col.property')}</th>
                <th className="px-5 py-3 text-left">{t('col.message')}</th>
                <th className="px-5 py-3 text-left">{t('col.date')}</th>
                <th className="px-5 py-3 text-left">{t('col.status')}</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {leads.map((l) => (
                <tr key={l._id} className="hover:bg-slate-50 transition">
                  <td className="px-5 py-3 font-semibold text-slate-800">{l.name}</td>
                  <td className="px-5 py-3">
                    <a href={`tel:${l.mobile}`} className="text-indigo-600 font-medium hover:underline">{l.mobile}</a>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{l.property?.name || '—'}</td>
                  <td className="px-5 py-3 text-slate-500 max-w-xs truncate">{l.message || '—'}</td>
                  <td className="px-5 py-3 text-slate-400">{new Date(l.createdAt).toLocaleDateString('en-IN')}</td>
                  <td className="px-5 py-3">
                    <select
                      value={l.status}
                      onChange={(e) => updateStatus.mutate({ id: l._id, status: e.target.value })}
                      className={`text-xs font-bold px-2.5 py-1 rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer ${STATUS_COLORS[l.status]}`}
                    >
                      {statusOptions.map((s) => <option key={s} value={s}>{t(`enum.${s}`)}</option>)}
                    </select>
                  </td>
                  <td className="px-5 py-3">
                    <button onClick={() => remove.mutate(l._id)} className="text-slate-300 hover:text-red-400 transition">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination
        currentPage={page}
        totalPages={leadsPagination?.totalPages ?? 1}
        onPageChange={setPage}
        itemsPerPage={limit}
        onItemsPerPageChange={setLimit}
        totalItems={leadsPagination?.total}
      />
    </div>
  );
}
