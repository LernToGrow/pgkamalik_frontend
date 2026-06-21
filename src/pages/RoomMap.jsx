import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, User, Calendar, Clock, Wrench, Phone, UserPlus, Home, Hotel } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import Modal from '../components/ui/Modal';

const ID_TYPES = ['aadhar', 'passport', 'driving_license', 'voter_id'];
const PAY_MODES = ['cash', 'upi', 'bank_transfer', 'cheque'];

function calcDays(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  return Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / 86400000));
}

const BED_CFG = {
  vacant:      { bg: 'bg-green-50',  border: 'border-green-300',  text: 'text-green-700',  tKey: 'roomMap.vacant',      icon: CheckCircle },
  occupied:    { bg: 'bg-red-50',    border: 'border-red-300',    text: 'text-red-700',    tKey: 'roomMap.occupied',    icon: User },
  leaving:     { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700', tKey: 'roomMap.leavingSoon', icon: Calendar },
  reserved:    { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-700', tKey: 'roomMap.reserved',    icon: Clock },
  maintenance: { bg: 'bg-slate-100', border: 'border-slate-300',  text: 'text-slate-500',  tKey: 'roomMap.maintenance', icon: Wrench },
  guest:       { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700', tKey: 'roomMap.guest',        icon: Hotel },
};

const LEGEND = ['vacant', 'occupied', 'leaving', 'reserved', 'maintenance', 'guest'];

export default function RoomMap() {
  const { t } = useTranslation();
  const [activePropertyId, setActivePropertyId] = useState(null);
  const [selectedBed, setSelectedBed] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);

  const { data: properties = [], isLoading: propLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: () => api.get('/properties', { params: { limit: 100 } }).then((r) => r.data.data.properties),
  });

  const propId = activePropertyId || properties[0]?._id;

  const { data: rooms = [], isLoading: roomsLoading, refetch } = useQuery({
    queryKey: ['rooms', propId],
    queryFn: () => api.get(`/rooms?propertyId=${propId}&limit=500`).then((r) => r.data.data.rooms),
    enabled: !!propId,
  });

  const stats = useMemo(() => {
    let total = 0, occupied = 0, vacant = 0, reserved = 0, leaving = 0, guest = 0;
    rooms.forEach((r) => r.beds?.forEach((b) => {
      total++;
      if (b.status === 'occupied') { occupied++; if (b.tenant?.intendedMoveOutDate) leaving++; }
      else if (b.status === 'vacant') vacant++;
      else if (b.status === 'reserved') reserved++;
      else if (b.status === 'guest') guest++;
    }));
    return { total, occupied, vacant, reserved, leaving, guest };
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    if (!statusFilter) return rooms;
    return rooms.filter((room) =>
      room.beds?.some((b) => {
        const isLeaving = b.status === 'occupied' && !!b.tenant?.intendedMoveOutDate;
        const effective = isLeaving ? 'leaving' : b.status;
        if (statusFilter === 'leaving') return isLeaving;
        if (statusFilter === 'occupied') return b.status === 'occupied' && !isLeaving;
        return effective === statusFilter;
      })
    );
  }, [rooms, statusFilter]);

  const loading = propLoading || roomsLoading;

  return (
    <div className="space-y-4">
      {/* Property tabs */}
      {properties.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {properties.map((p) => (
            <button
              key={p._id}
              onClick={() => setActivePropertyId(p._id)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                propId === p._id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          { tKey: 'roomMap.total',    value: stats.total,    color: 'text-indigo-700', bg: 'bg-indigo-50',  border: 'border-indigo-200',  activeBorder: 'border-indigo-500',  filter: null },
          { tKey: 'roomMap.occupied', value: stats.occupied, color: 'text-red-700',    bg: 'bg-red-50',     border: 'border-red-200',     activeBorder: 'border-red-500',     filter: 'occupied' },
          { tKey: 'roomMap.vacant',   value: stats.vacant,   color: 'text-green-700',  bg: 'bg-green-50',   border: 'border-green-200',   activeBorder: 'border-green-500',   filter: 'vacant' },
          { tKey: 'roomMap.leaving',  value: stats.leaving,  color: 'text-orange-700', bg: 'bg-orange-50',  border: 'border-orange-200',  activeBorder: 'border-orange-500',  filter: 'leaving' },
          { tKey: 'roomMap.reserved', value: stats.reserved, color: 'text-yellow-700', bg: 'bg-yellow-50',  border: 'border-yellow-200',  activeBorder: 'border-yellow-500',  filter: 'reserved' },
          { tKey: 'roomMap.guest',    value: stats.guest,    color: 'text-purple-700', bg: 'bg-purple-50',  border: 'border-purple-200',  activeBorder: 'border-purple-500',  filter: 'guest' },
        ].map((s) => {
          const isActive = statusFilter === s.filter;
          return (
            <button
              key={s.tKey}
              onClick={() => setStatusFilter(isActive ? null : s.filter)}
              className={`${s.bg} border-2 rounded-xl p-3 text-center w-full transition-all ${isActive ? s.activeBorder + ' ring-2 ring-offset-1 ring-current shadow-sm' : s.border + ' hover:border-current'}`}
            >
              <div className={`text-2xl font-extrabold ${s.color}`}>{s.value}</div>
              <div className={`text-xs font-semibold mt-0.5 ${s.color}`}>{t(s.tKey)}</div>
            </button>
          );
        })}
      </div>

      {/* Room grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="h-32 bg-white rounded-xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Home size={48} className="mb-3" />
          <p className="text-base font-medium">{statusFilter ? t('roomMap.noRoomsFilter') : t('roomMap.noRooms')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRooms.map((room) => (
            <RoomCard key={room._id} room={room} onBedClick={(bed) => setSelectedBed({ bed, room })} />
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 pt-2">
        {LEGEND.map((status) => {
          const c = BED_CFG[status];
          return (
            <div key={status} className="flex items-center gap-1.5">
              <div className={`w-3.5 h-3.5 rounded ${c.bg} border ${c.border}`} />
              <span className={`text-xs font-semibold ${c.text}`}>{t(c.tKey)}</span>
            </div>
          );
        })}
      </div>

      {/* Bed detail modal */}
      {selectedBed && (
        <BedModal
          bed={selectedBed.bed}
          room={selectedBed.room}
          propId={propId}
          onClose={() => setSelectedBed(null)}
          t={t}
        />
      )}
    </div>
  );
}

function RoomCard({ room, onBedClick }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="font-bold text-slate-800">Room {room.roomNumber}</p>
          <p className="text-xs text-slate-400 mt-0.5">Floor {room.floor || 1} · {room.type}</p>
        </div>
        <span className="text-sm font-bold text-indigo-600">₹{room.rent?.toLocaleString('en-IN')}/mo</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {(room.beds || []).map((bed) => {
          const isLeaving = bed.status === 'occupied' && !!bed.tenant?.intendedMoveOutDate;
          const effectiveStatus = isLeaving ? 'leaving' : bed.status;
          const c = BED_CFG[effectiveStatus] || BED_CFG.vacant;
          const Icon = c.icon;
          return (
            <button
              key={bed._id}
              onClick={() => onBedClick(bed)}
              className={`w-16 h-18 rounded-xl border-2 ${c.bg} ${c.border} flex flex-col items-center justify-center gap-0.5 p-1.5 hover:opacity-80 transition-opacity`}
            >
              <Icon size={16} className={c.text} />
              <span className={`text-xs font-bold ${c.text}`}>{bed.label}</span>
              {bed.status === 'occupied' && bed.tenant?.name && (
                <span className={`text-[9px] font-semibold ${c.text} truncate w-full text-center`}>
                  {bed.tenant.name.split(' ')[0]}
                </span>
              )}
              {bed.status === 'guest' && (
                <span className={`text-[9px] font-semibold ${c.text} truncate w-full text-center`}>Guest</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BedModal({ bed, room, propId, onClose, t }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [view, setView] = useState('detail'); // 'detail' | 'addGuest'
  const today = new Date().toISOString().slice(0, 10);
  const [gForm, setGForm] = useState({
    name: '', mobile: '', idType: 'aadhar', idNumber: '',
    checkInDate: today, checkOutDate: '', dailyRate: '', amountPaid: '0', paymentMode: 'cash', purpose: '',
  });

  const isLeaving = bed.status === 'occupied' && !!bed.tenant?.intendedMoveOutDate;
  const effectiveStatus = isLeaving ? 'leaving' : bed.status;
  const c = BED_CFG[effectiveStatus] || BED_CFG.vacant;
  const Icon = c.icon;

  const days = calcDays(gForm.checkInDate, gForm.checkOutDate);
  const total = days * Number(gForm.dailyRate || 0);
  const balance = Math.max(0, total - Number(gForm.amountPaid || 0));

  const addGuest = useMutation({
    mutationFn: (d) => api.post('/guests', d),
    onSuccess: () => {
      qc.invalidateQueries(['rooms', propId]);
      qc.invalidateQueries(['guests']);
      toast.success(t('toast.saved'));
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  const handleGuestSubmit = (e) => {
    e.preventDefault();
    addGuest.mutate({
      ...gForm,
      property: room?.property,
      room: room?._id,
      bedLabel: bed.label,
      dailyRate: Number(gForm.dailyRate),
      amountPaid: Number(gForm.amountPaid || 0),
    });
  };

  const title = view === 'addGuest'
    ? `${t('guests.addGuest')} — Room ${room?.roomNumber} Bed ${bed.label}`
    : `Room ${room?.roomNumber} — Bed ${bed.label}`;

  return (
    <Modal title={title} onClose={onClose}>
      {view === 'addGuest' ? (
        <form onSubmit={handleGuestSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{t('col.name')}</label>
              <input required value={gForm.name} onChange={(e) => setGForm({ ...gForm, name: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{t('common.mobile')}</label>
              <input required value={gForm.mobile} onChange={(e) => setGForm({ ...gForm, mobile: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{t('guests.idType')}</label>
              <select value={gForm.idType} onChange={(e) => setGForm({ ...gForm, idType: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                {ID_TYPES.map((id) => <option key={id} value={id}>{t(`enum.${id}`)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{t('guests.idNumber')}</label>
              <input value={gForm.idNumber} onChange={(e) => setGForm({ ...gForm, idNumber: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{t('guests.checkIn')}</label>
              <input type="date" required value={gForm.checkInDate} onChange={(e) => setGForm({ ...gForm, checkInDate: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{t('guests.checkOut')}</label>
              <input type="date" required value={gForm.checkOutDate} min={gForm.checkInDate} onChange={(e) => setGForm({ ...gForm, checkOutDate: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{t('guests.dailyRate')} (₹)</label>
              <input type="number" required min="0" value={gForm.dailyRate} onChange={(e) => setGForm({ ...gForm, dailyRate: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{t('guests.amountPaid')} (₹)</label>
              <input type="number" min="0" value={gForm.amountPaid} onChange={(e) => setGForm({ ...gForm, amountPaid: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{t('col.paymentMode')}</label>
              <select value={gForm.paymentMode} onChange={(e) => setGForm({ ...gForm, paymentMode: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                {PAY_MODES.map((m) => <option key={m} value={m}>{t(`enum.${m}`)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{t('guests.purpose')}</label>
              <input value={gForm.purpose} onChange={(e) => setGForm({ ...gForm, purpose: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>
          {total > 0 && (
            <div className="bg-purple-50 rounded-lg p-3 text-sm text-purple-700 flex gap-4">
              <span>{days} {days === 1 ? 'day' : 'days'} · {t('guests.totalAmount')}: <strong>₹{total}</strong></span>
              {balance > 0 && <span>{t('guests.balance')}: <strong>₹{balance}</strong></span>}
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setView('detail')} className="flex-1 border border-slate-300 text-slate-700 py-2 rounded-lg text-sm hover:bg-slate-50">{t('common.cancel')}</button>
            <button type="submit" disabled={addGuest.isPending} className="flex-1 bg-purple-600 text-white py-2 rounded-lg text-sm hover:bg-purple-700 disabled:opacity-60">
              {addGuest.isPending ? t('common.saving') : t('guests.addGuest')}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${c.bg} border ${c.border}`}>
            <Icon size={15} className={c.text} />
            <span className={`text-sm font-bold ${c.text}`}>{t(c.tKey)}</span>
          </div>

          <p className="text-xs text-slate-400">{room?.type} · Floor {room?.floor || 1}</p>

          {bed.status === 'guest' ? (
            <div className="flex items-center gap-3 bg-purple-50 rounded-xl p-3 border border-purple-100">
              <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-base shrink-0">
                <Hotel size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800">{t('roomMap.guest')}</p>
                <p className="text-xs text-purple-600 font-semibold mt-0.5">{t('guests.stayStatus')}</p>
              </div>
              <button onClick={() => { onClose(); navigate('/guests'); }}
                className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg transition-colors">
                {t('nav.guests')}
              </button>
            </div>
          ) : bed.status === 'occupied' && bed.tenant ? (
            <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-base shrink-0">
                {bed.tenant.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 truncate">{bed.tenant.name}</p>
                <p className="text-sm text-slate-500">{bed.tenant.mobile}</p>
                {isLeaving && (
                  <p className="text-xs text-orange-600 font-semibold mt-0.5">
                    {t('roomMap.leaving')} {new Date(bed.tenant.intendedMoveOutDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </p>
                )}
              </div>
              {bed.tenant.mobile && (
                <a href={`tel:${bed.tenant.mobile}`} className="w-9 h-9 bg-green-600 rounded-full flex items-center justify-center text-white hover:bg-green-700 transition-colors">
                  <Phone size={15} />
                </a>
              )}
            </div>
          ) : bed.status === 'vacant' ? (
            <div className="space-y-3">
              <div className="text-center py-2">
                <p className="text-2xl font-extrabold text-green-600">₹{room?.rent?.toLocaleString('en-IN')}/mo</p>
                <p className="text-sm text-slate-500 mt-1">{t('roomMap.bedAvailable')}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { onClose(); navigate('/tenants', { state: { openAdd: true, prefill: { propertyId: room?.property, roomId: room?._id, bedId: bed?._id, roomObj: room } } }); }}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  <UserPlus size={15} /> {t('roomMap.addTenant')}
                </button>
                <button
                  onClick={() => setView('addGuest')}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  <Hotel size={15} /> {t('guests.addGuest')}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500 py-2">
              {bed.status === 'reserved' ? t('roomMap.bedReserved') : t('roomMap.underMaintenance')}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}

