import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';

const fetchSettings = async () => {
  const { data } = await api.get('/superadmin/settings');
  return data.data.settings;
};

const Field = ({ label, hint, children }) => (
  <div className="space-y-1">
    <label className="block text-sm font-medium text-slate-700">{label}</label>
    {hint && <p className="text-xs text-slate-400">{hint}</p>}
    {children}
  </div>
);

const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
const textareaCls = `${inputCls} resize-y min-h-32`;

export default function SuperadminAppSettings() {
  const qc = useQueryClient();
  const { data: settings, isLoading } = useQuery({ queryKey: ['superadmin-settings'], queryFn: fetchSettings });

  const [general, setGeneral] = useState({ lateFeePercent: 5, rentDueDay: 10, gracePeriodDays: 3, announcementBanner: '' });
  const [privacy, setPrivacy] = useState('');
  const [terms, setTerms] = useState('');

  useEffect(() => {
    if (settings) {
      setGeneral({
        lateFeePercent: settings.lateFeePercent ?? 5,
        rentDueDay: settings.rentDueDay ?? 10,
        gracePeriodDays: settings.gracePeriodDays ?? 3,
        announcementBanner: settings.announcementBanner ?? '',
      });
      setPrivacy(settings.privacyPolicy ?? '');
      setTerms(settings.termsAndConditions ?? '');
    }
  }, [settings]);

  const saveGeneral = useMutation({
    mutationFn: () => api.patch('/superadmin/settings', general),
    onSuccess: () => { toast.success('Settings saved'); qc.invalidateQueries(['superadmin-settings']); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const savePrivacy = useMutation({
    mutationFn: () => api.patch('/superadmin/settings/privacy-policy', { privacyPolicy: privacy }),
    onSuccess: () => { toast.success('Privacy policy saved'); qc.invalidateQueries(['superadmin-settings']); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const saveTerms = useMutation({
    mutationFn: () => api.patch('/superadmin/settings/terms', { termsAndConditions: terms }),
    onSuccess: () => { toast.success('Terms saved'); qc.invalidateQueries(['superadmin-settings']); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  if (isLoading) return <div className="p-6 text-slate-500">Loading settings…</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">App Settings</h1>

      {/* General Config */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 space-y-4">
        <h2 className="text-base font-semibold text-slate-700">General Configuration</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Late Fee (%)" hint="Applied after grace period">
            <input type="number" min={0} max={100} value={general.lateFeePercent}
              onChange={(e) => setGeneral({ ...general, lateFeePercent: Number(e.target.value) })}
              className={inputCls} />
          </Field>
          <Field label="Rent Due Day" hint="Day of month rent is due">
            <input type="number" min={1} max={28} value={general.rentDueDay}
              onChange={(e) => setGeneral({ ...general, rentDueDay: Number(e.target.value) })}
              className={inputCls} />
          </Field>
          <Field label="Grace Period (days)" hint="Days before marking overdue">
            <input type="number" min={0} max={30} value={general.gracePeriodDays}
              onChange={(e) => setGeneral({ ...general, gracePeriodDays: Number(e.target.value) })}
              className={inputCls} />
          </Field>
        </div>

        <Field label="Announcement Banner" hint="Shown to all users on the app (leave blank to hide)">
          <input type="text" value={general.announcementBanner}
            onChange={(e) => setGeneral({ ...general, announcementBanner: e.target.value })}
            placeholder="e.g. Maintenance scheduled on 25 June…"
            className={inputCls} />
        </Field>

        <button
          onClick={() => saveGeneral.mutate()}
          disabled={saveGeneral.isPending}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-60"
        >
          <Save size={14} /> {saveGeneral.isPending ? 'Saving…' : 'Save Settings'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Privacy Policy */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 space-y-3 flex flex-col">
          <h2 className="text-base font-semibold text-slate-700">Privacy Policy</h2>
          <p className="text-xs text-slate-400">Accessible publicly at <code className="bg-slate-100 px-1 rounded">/api/public/privacy-policy</code> — shown in the mobile app.</p>
          <textarea value={privacy} onChange={(e) => setPrivacy(e.target.value)} className={`${textareaCls} flex-1`} placeholder="Enter privacy policy text…" />
          <button
            onClick={() => savePrivacy.mutate()}
            disabled={savePrivacy.isPending || !privacy}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-60 self-start"
          >
            <Save size={14} /> {savePrivacy.isPending ? 'Saving…' : 'Save Privacy Policy'}
          </button>
        </div>

        {/* Terms & Conditions */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 space-y-3 flex flex-col">
          <h2 className="text-base font-semibold text-slate-700">Terms &amp; Conditions</h2>
          <p className="text-xs text-slate-400">Accessible publicly at <code className="bg-slate-100 px-1 rounded">/api/public/terms</code> — shown in the mobile app.</p>
          <textarea value={terms} onChange={(e) => setTerms(e.target.value)} className={`${textareaCls} flex-1`} placeholder="Enter terms and conditions text…" />
          <button
            onClick={() => saveTerms.mutate()}
            disabled={saveTerms.isPending || !terms}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-60 self-start"
          >
            <Save size={14} /> {saveTerms.isPending ? 'Saving…' : 'Save Terms'}
          </button>
        </div>
      </div>
    </div>
  );
}
