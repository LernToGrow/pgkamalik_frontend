import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, LogOut, Calendar, X, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import SearchBar from '../components/ui/SearchBar';
import { useProperty } from '../context/PropertyContext';

const empty = { name: '', mobile: '', email: '', aadhaar: '', property: '', roomId: '', bedId: '', checkInDate: '', securityDeposit: 0 };

export default function Tenants() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const location = useLocation();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [noticeModal, setNoticeModal] = useState(null);
  const [noticeDate, setNoticeDate] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '' | 'active' | 'moved_out' | 'overdue'
  const { propertyId } = useProperty();

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => { setPage(1); }, [propertyId]);

  useEffect(() => {
    const state = location.state;
    if (state?.openAdd) {
      const p = state.prefill || {};
      setForm({ ...empty, property: p.propertyId || '', roomId: p.roomId || '', bedId: p.bedId || '' });
      setSelectedRoom(p.roomObj || null);
      setEditing(null);
      setModal('form');
    }
    if (state?.filter) {
      setStatusFilter(state.filter);
      setPage(1);
    }
    if (state) window.history.replaceState({}, '');
  }, []);

  const { data: tenantsData, isLoading } = useQuery({
    queryKey: ['tenants', page, limit, search, propertyId, statusFilter],
    queryFn: () => api.get('/tenants', { params: {
      page, limit,
      ...(search && { search }),
      ...(propertyId && { propertyId }),
      ...(statusFilter === 'overdue' ? { overdue: 'true' } : statusFilter ? { status: statusFilter } : {}),
    }}).then((r) => r.data),
  });

  const tenants = tenantsData?.data?.tenants;
  const tenantsPagination = tenantsData?.pagination;

  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: () => api.get('/properties', { params: { limit: 100 } }).then((r) => r.data.data.properties),
  });

  const { data: rooms } = useQuery({
    queryKey: ['rooms', form.property],
    queryFn: () => form.property ? api.get(`/rooms?propertyId=${form.property}&limit=100`).then((r) => r.data.data.rooms) : Promise.resolve([]),
    enabled: !!form.property,
  });

  const save = useMutation({
    mutationFn: (d) => editing
      ? api.put(`/tenants/${editing}`, { name: d.name, mobile: d.mobile, email: d.email, aadhaar: d.aadhaar })
      : api.post('/tenants', d),
    onSuccess: () => { qc.invalidateQueries(['tenants']); qc.invalidateQueries(['rooms']); setModal(null); toast.success(t('toast.saved')); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  const moveOut = useMutation({
    mutationFn: (id) => api.patch(`/tenants/${id}/moveout`, { actualCheckOut: new Date().toISOString() }),
    onSuccess: () => { qc.invalidateQueries(['tenants']); qc.invalidateQueries(['rooms']); toast.success('Tenant moved out'); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  const recordNotice = useMutation({
    mutationFn: ({ id, noticeGivenDate }) => api.patch(`/tenants/${id}/notice`, { noticeGivenDate }),
    onSuccess: () => { qc.invalidateQueries(['tenants']); setNoticeModal(null); toast.success(t('tenants.noticeRecorded')); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  const cancelNotice = useMutation({
    mutationFn: (id) => api.patch(`/tenants/${id}/notice/cancel`),
    onSuccess: () => { qc.invalidateQueries(['tenants']); toast.success(t('tenants.noticeCancelled')); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  const openAdd = () => { setForm(empty); setEditing(null); setSelectedRoom(null); setModal('form'); };
  const openEdit = (row) => {
    setForm({ name: row.name, mobile: row.mobile, email: row.email || '', aadhaar: row.aadhaar || '', property: '', roomId: '', bedId: '', checkInDate: '', securityDeposit: row.securityDeposit });
    setEditing(row._id); setModal('form');
  };

  const vacantBeds = (selectedRoom?.beds || []).filter((b) => b.status === 'vacant');

  const columns = [
    { key: 'name', label: t('col.name') },
    { key: 'mobile', label: t('col.mobile') },
    { key: 'room', label: t('col.room'), render: (r) => r.room?.roomNumber ? `${r.room.roomNumber} - Bed ${r.bedLabel}` : '—' },
    { key: 'status', label: t('col.status'), render: (r) => (
      <div className="flex flex-col gap-1">
        <Badge label={r.status ? t(`enum.${r.status}`) : '—'} variant={r.status === 'active' ? 'green' : 'slate'} />
        {r.intendedMoveOutDate && (
          <span className="text-[11px] font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full w-fit">
            🗓 {t('tenants.leavingBadge')} {new Date(r.intendedMoveOutDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        )}
      </div>
    ) },
    { key: 'checkInDate', label: t('col.checkIn'), render: (r) => r.checkInDate ? new Date(r.checkInDate).toLocaleDateString() : '—' },
  ];

  const STATUS_FILTERS = [
    { key: '',          label: 'All' },
    { key: 'active',    label: 'Active' },
    { key: 'moved_out', label: 'Moved Out' },
    { key: 'overdue',   label: 'Overdue Rent', icon: AlertTriangle, color: 'text-red-600', activeBg: 'bg-red-600', activeBorder: 'border-red-600' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="text-sm text-slate-500 shrink-0">{tenantsPagination?.total ?? tenants?.length ?? 0} {t('col.tenants')}</p>
        <div className="flex-1"><SearchBar value={searchInput} onChange={setSearchInput} placeholder={t('search.tenantName')} /></div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors shrink-0">
          <Plus size={16} /> {t('tenants.addTenant')}
        </button>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => {
          const isActive = statusFilter === f.key;
          const Icon = f.icon;
          return (
            <button
              key={f.key}
              onClick={() => { setStatusFilter(f.key); setPage(1); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                isActive
                  ? `${f.activeBg || 'bg-indigo-600'} text-white ${f.activeBorder || 'border-indigo-600'}`
                  : `bg-white border-slate-200 text-slate-600 hover:bg-slate-50 ${f.color || ''}`
              }`}
            >
              {Icon && <Icon size={13} />}
              {f.label}
            </button>
          );
        })}
        {statusFilter === 'overdue' && (
          <span className="flex items-center text-xs text-red-500 font-medium ml-1">
            — showing tenants with unpaid rent past due date
          </span>
        )}
      </div>

      {isLoading ? <div className="h-40 bg-white rounded-xl border border-slate-200 animate-pulse" /> : (
        <>
          <Table columns={columns} data={tenants || []}
            actions={(row) => (
              <div className="flex gap-2 items-center">
                <button onClick={() => openEdit(row)} className="text-slate-400 hover:text-indigo-600" title="Edit"><Pencil size={15} /></button>
                {row.status === 'active' && (
                  row.intendedMoveOutDate ? (
                    <button
                      onClick={() => { if (confirm(`${t('tenants.cancelNoticeConfirm')} ${row.name}?`)) cancelNotice.mutate(row._id); }}
                      className="text-slate-400 hover:text-slate-600 text-xs font-semibold flex items-center gap-1"
                      title="Cancel Notice"
                    >
                      <X size={13} /> Notice
                    </button>
                  ) : (
                    <button
                      onClick={() => { setNoticeDate(new Date().toISOString().split('T')[0]); setNoticeModal(row); }}
                      className="text-orange-500 hover:text-orange-700 flex items-center gap-1 text-xs font-semibold"
                      title="Record Notice"
                    >
                      <Calendar size={13} /> Notice
                    </button>
                  )
                )}
                {row.status === 'active' && (
                  <button onClick={() => { if (confirm(t('tenants.markMoveOut'))) moveOut.mutate(row._id); }} className="text-slate-400 hover:text-amber-600" title="Move Out">
                    <LogOut size={15} />
                  </button>
                )}
              </div>
            )}
          />
          <Pagination
            currentPage={page}
            totalPages={tenantsPagination?.totalPages ?? 1}
            onPageChange={setPage}
            itemsPerPage={limit}
            onItemsPerPageChange={setLimit}
            totalItems={tenantsPagination?.total}
          />
        </>
      )}

      {noticeModal && (
        <Modal title={t('tenants.recordNotice')} onClose={() => setNoticeModal(null)}>
          <div className="space-y-4">
            <div>
              <p className="font-bold text-slate-800 text-base">{noticeModal.name}</p>
              <p className="text-sm text-slate-400">Room {noticeModal.room?.roomNumber} · Bed {noticeModal.bedLabel}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('tenants.noticeGivenDate')}</label>
              <input type="date" value={noticeDate} onChange={(e) => setNoticeDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            {noticeDate && (
              <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                <p className="text-xs text-slate-400 font-semibold mb-1">{t('tenants.moveOutDateAuto')}</p>
                <p className="text-xl font-extrabold text-orange-600">
                  {new Date(new Date(noticeDate).getTime() + 30 * 86400000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                <p className="text-xs text-orange-300 mt-1">{t('tenants.daysFromNotice')}</p>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setNoticeModal(null)} className="flex-1 border border-slate-300 text-slate-700 py-2 rounded-lg text-sm hover:bg-slate-50">Cancel</button>
              <button
                onClick={() => recordNotice.mutate({ id: noticeModal._id, noticeGivenDate: noticeDate })}
                disabled={recordNotice.isPending || !noticeDate}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
              >
                {recordNotice.isPending ? t('common.saving') : t('tenants.recordNoticeBtn')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {modal === 'form' && (
        <Modal title={editing ? t('tenants.editTenant') : t('tenants.addTenant')} onClose={() => setModal(null)}>
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
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.email')}</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('tenants.aadhaar')}</label>
              <input value={form.aadhaar} onChange={(e) => setForm({ ...form, aadhaar: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            {!editing && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.property')}</label>
                  <select required value={form.property} onChange={(e) => { setForm({ ...form, property: e.target.value, roomId: '', bedId: '' }); setSelectedRoom(null); }}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">{t('common.selectProperty')}</option>
                    {(properties || []).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.room')}</label>
                  <select required value={form.roomId} onChange={(e) => {
                    const room = (rooms || []).find((r) => r._id === e.target.value);
                    setSelectedRoom(room || null);
                    setForm({ ...form, roomId: e.target.value, bedId: '' });
                  }}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">{t('common.selectRoom')}</option>
                    {(rooms || []).map((r) => <option key={r._id} value={r._id}>{r.roomNumber} ({r.type})</option>)}
                  </select>
                </div>
                {selectedRoom && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('tenants.bed')}</label>
                    <select required value={form.bedId} onChange={(e) => setForm({ ...form, bedId: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="">{t('common.selectBed')}</option>
                      {vacantBeds.map((b) => <option key={b._id} value={b._id}>Bed {b.label}</option>)}
                    </select>
                    {vacantBeds.length === 0 && <p className="text-xs text-red-500 mt-1">{t('tenants.noVacantBeds')}</p>}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('tenants.checkInDate')}</label>
                  <input type="date" required value={form.checkInDate} onChange={(e) => setForm({ ...form, checkInDate: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('tenants.securityDeposit')}</label>
                  <input type="number" value={form.securityDeposit} onChange={(e) => setForm({ ...form, securityDeposit: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </>
            )}

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
