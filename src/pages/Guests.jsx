import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import SearchBar from '../components/ui/SearchBar';
import { useProperty } from '../context/PropertyContext';

const idTypes = ['aadhar', 'passport', 'driving_license', 'voter_id'];
const paymentModes = ['cash', 'upi', 'bank_transfer', 'cheque'];
const empty = { property: '', room: '', bedLabel: '', name: '', mobile: '', idType: 'aadhar', idNumber: '', checkInDate: '', checkOutDate: '', dailyRate: '', amountPaid: '', paymentMode: 'cash', purpose: '', notes: '' };

function calcTotal(checkIn, checkOut, dailyRate) {
  if (!checkIn || !checkOut || !dailyRate) return 0;
  const days = Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)));
  return days * Number(dailyRate);
}

export default function Guests() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [checkoutGuest, setCheckoutGuest] = useState(null);
  const [checkoutPaid, setCheckoutPaid] = useState('');
  const [checkoutMode, setCheckoutMode] = useState('cash');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { propertyId } = useProperty();

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => { setPage(1); }, [propertyId]);

  const { data: guestsData, isLoading } = useQuery({
    queryKey: ['guests', page, limit, search, propertyId, statusFilter],
    queryFn: () => api.get('/guests', { params: { page, limit, ...(search && { search }), ...(propertyId && { propertyId }), ...(statusFilter && { status: statusFilter }) } }).then((r) => r.data),
  });

  const data = guestsData?.data?.guests;
  const guestsPagination = guestsData?.pagination;

  const { data: properties } = useQuery({ queryKey: ['properties'], queryFn: () => api.get('/properties', { params: { limit: 100 } }).then((r) => r.data.data.properties) });

  const { data: rooms } = useQuery({
    queryKey: ['rooms', form.property],
    queryFn: () => form.property ? api.get(`/rooms?propertyId=${form.property}&limit=100`).then((r) => r.data.data.rooms) : Promise.resolve([]),
    enabled: !!form.property,
  });

  const selectedRoom = (rooms || []).find((r) => r._id === form.room);
  const vacantBeds = (selectedRoom?.beds || []).filter((b) => b.status === 'vacant');

  const save = useMutation({
    mutationFn: (d) => editing ? api.put(`/guests/${editing}`, d) : api.post('/guests', d),
    onSuccess: () => { qc.invalidateQueries(['guests']); qc.invalidateQueries(['rooms']); setModal(null); toast.success(t('toast.saved')); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  const checkout = useMutation({
    mutationFn: ({ id, amountPaid, paymentMode }) => api.patch(`/guests/${id}/checkout`, { amountPaid: Number(amountPaid), paymentMode }),
    onSuccess: () => { qc.invalidateQueries(['guests']); qc.invalidateQueries(['rooms']); setModal(null); toast.success(t('guests.checkedOut')); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  const openAdd = () => { setForm(empty); setEditing(null); setModal('form'); };
  const openEdit = (row) => {
    setForm({
      property: row.property?._id || row.property || '',
      room: row.room?._id || row.room || '',
      bedLabel: row.bedLabel || '',
      name: row.name, mobile: row.mobile,
      idType: row.idType || 'aadhar', idNumber: row.idNumber || '',
      checkInDate: row.checkInDate?.slice(0, 10) || '',
      checkOutDate: row.checkOutDate?.slice(0, 10) || '',
      dailyRate: row.dailyRate, amountPaid: row.amountPaid,
      paymentMode: row.paymentMode || 'cash',
      purpose: row.purpose || '', notes: row.notes || '',
    });
    setEditing(row._id);
    setModal('form');
  };
  const openCheckout = (row) => {
    setCheckoutGuest(row);
    setCheckoutPaid(String(row.amountPaid || ''));
    setCheckoutMode(row.paymentMode || 'cash');
    setModal('checkout');
  };

  const total = calcTotal(form.checkInDate, form.checkOutDate, form.dailyRate);

  const columns = [
    { key: 'name', label: t('col.name') },
    { key: 'mobile', label: t('col.mobile') },
    { key: 'room', label: t('col.room'), render: (r) => r.room?.roomNumber ? `${r.room.roomNumber} - ${t('guests.bed')} ${r.bedLabel}` : '—' },
    { key: 'checkInDate', label: t('guests.checkIn'), render: (r) => r.checkInDate ? new Date(r.checkInDate).toLocaleDateString() : '—' },
    { key: 'checkOutDate', label: t('guests.checkOut'), render: (r) => r.checkOutDate ? new Date(r.checkOutDate).toLocaleDateString() : '—' },
    { key: 'dailyRate', label: t('guests.dailyRate'), render: (r) => `₹${r.dailyRate}/day` },
    { key: 'paymentStatus', label: t('col.status'), render: (r) => <Badge label={r.paymentStatus ? t(`enum.${r.paymentStatus}`) : '—'} /> },
    { key: 'status', label: t('guests.stayStatus'), render: (r) => <Badge label={r.status ? t(`enum.${r.status}`) : '—'} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="text-sm text-slate-500 shrink-0">{guestsPagination?.total ?? data?.length ?? 0} {t('guests.title')}</p>
        <div className="flex-1"><SearchBar value={searchInput} onChange={setSearchInput} placeholder={t('search.nameMobile')} /></div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">{t('guests.allGuests')}</option>
          <option value="active">{t('enum.active')}</option>
          <option value="checked_out">{t('enum.checked_out')}</option>
        </select>
        <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors shrink-0">
          <Plus size={16} /> {t('guests.addGuest')}
        </button>
      </div>

      {isLoading ? <div className="h-40 bg-white rounded-xl border border-slate-200 animate-pulse" /> : (
        <>
          <Table columns={columns} data={data || []}
            actions={(row) => (
              <div className="flex gap-2">
                {row.status === 'active' && (
                  <>
                    <button onClick={() => openEdit(row)} className="text-slate-400 hover:text-indigo-600"><Pencil size={15} /></button>
                    <button onClick={() => openCheckout(row)} className="text-slate-400 hover:text-amber-600" title={t('guests.checkOut')}><LogOut size={15} /></button>
                  </>
                )}
              </div>
            )}
          />
          <Pagination
            currentPage={page}
            totalPages={guestsPagination?.totalPages ?? 1}
            onPageChange={setPage}
            itemsPerPage={limit}
            onItemsPerPageChange={setLimit}
            totalItems={guestsPagination?.total}
          />
        </>
      )}

      {modal === 'form' && (
        <Modal title={editing ? t('guests.editGuest') : t('guests.addGuest')} onClose={() => setModal(null)}>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.property')}</label>
                <select required value={form.property} onChange={(e) => setForm({ ...form, property: e.target.value, room: '', bedLabel: '' })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">{t('common.selectProperty')}</option>
                  {(properties || []).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('col.room')}</label>
                <select required value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value, bedLabel: '' })}
                  disabled={!form.property}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50">
                  <option value="">{t('guests.selectRoom')}</option>
                  {(rooms || []).map((r) => <option key={r._id} value={r._id}>Room {r.roomNumber}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('guests.bed')}</label>
                <select required value={form.bedLabel} onChange={(e) => setForm({ ...form, bedLabel: e.target.value })}
                  disabled={!form.room || vacantBeds.length === 0}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50">
                  <option value="">{t('guests.selectBed')}</option>
                  {vacantBeds.map((b) => <option key={b._id} value={b.label}>{b.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('col.name')}</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.mobile')}</label>
                <input required value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('guests.idType')}</label>
                <select value={form.idType} onChange={(e) => setForm({ ...form, idType: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {idTypes.map((id) => <option key={id} value={id}>{t(`enum.${id}`)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('guests.idNumber')}</label>
                <input value={form.idNumber} onChange={(e) => setForm({ ...form, idNumber: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('guests.checkIn')}</label>
                <input type="date" required value={form.checkInDate} onChange={(e) => setForm({ ...form, checkInDate: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('guests.checkOut')}</label>
                <input type="date" required value={form.checkOutDate} min={form.checkInDate} onChange={(e) => setForm({ ...form, checkOutDate: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('guests.dailyRate')} (₹)</label>
                <input type="number" required min="0" value={form.dailyRate} onChange={(e) => setForm({ ...form, dailyRate: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('guests.amountPaid')} (₹)</label>
                <input type="number" min="0" value={form.amountPaid} onChange={(e) => setForm({ ...form, amountPaid: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('col.paymentMode')}</label>
                <select value={form.paymentMode} onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {paymentModes.map((m) => <option key={m} value={m}>{t(`enum.${m}`)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('guests.purpose')}</label>
                <input value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            {total > 0 && (
              <div className="bg-indigo-50 rounded-lg p-3 text-sm text-indigo-700">
                {t('guests.totalAmount')}: <span className="font-semibold">₹{total}</span>
                {form.amountPaid > 0 && <> &nbsp;·&nbsp; {t('guests.balance')}: <span className="font-semibold">₹{Math.max(0, total - Number(form.amountPaid))}</span></>}
              </div>
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

      {modal === 'checkout' && checkoutGuest && (
        <Modal title={t('guests.checkOutGuest')} onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
              <p><span className="text-slate-500">{t('col.name')}:</span> <span className="font-medium">{checkoutGuest.name}</span></p>
              <p><span className="text-slate-500">{t('col.room')}:</span> <span className="font-medium">{checkoutGuest.room?.roomNumber} — {t('guests.bed')} {checkoutGuest.bedLabel}</span></p>
              <p><span className="text-slate-500">{t('guests.checkIn')}:</span> <span className="font-medium">{new Date(checkoutGuest.checkInDate).toLocaleDateString()}</span></p>
              <p><span className="text-slate-500">{t('guests.dailyRate')}:</span> <span className="font-medium">₹{checkoutGuest.dailyRate}/day</span></p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('guests.amountPaid')} (₹)</label>
              <input type="number" min="0" value={checkoutPaid} onChange={(e) => setCheckoutPaid(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('col.paymentMode')}</label>
              <select value={checkoutMode} onChange={(e) => setCheckoutMode(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {paymentModes.map((m) => <option key={m} value={m}>{t(`enum.${m}`)}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)} className="flex-1 border border-slate-300 text-slate-700 py-2 rounded-lg text-sm hover:bg-slate-50">{t('common.cancel')}</button>
              <button onClick={() => checkout.mutate({ id: checkoutGuest._id, amountPaid: checkoutPaid, paymentMode: checkoutMode })}
                disabled={checkout.isPending}
                className="flex-1 bg-amber-500 text-white py-2 rounded-lg text-sm hover:bg-amber-600 disabled:opacity-60">
                {checkout.isPending ? t('common.saving') : t('guests.confirmCheckOut')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
