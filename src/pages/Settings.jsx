import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { User, Lock, Save } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

function Section({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100 bg-slate-50">
        <Icon size={18} className="text-indigo-600" />
        <h3 className="font-semibold text-slate-800">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Field({ label, type = 'text', value, onChange, placeholder, required }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
    </div>
  );
}

export default function Settings() {
  const { t } = useTranslation();
  const { user, login } = useAuth();
  const qc = useQueryClient();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/auth/me').then((r) => r.data.data.owner),
    onSuccess: (data) => {
      setName(data.name || '');
      setPhone(data.phone || '');
    },
  });

  const profileMutation = useMutation({
    mutationFn: (body) => api.patch('/auth/me', body),
    onSuccess: (res) => {
      const updated = res.data.data.owner;
      localStorage.setItem('user', JSON.stringify(updated));
      qc.invalidateQueries(['me']);
      toast.success(t('toast.profileUpdated'));
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update profile'),
  });

  const passwordMutation = useMutation({
    mutationFn: (body) => api.patch('/auth/change-password', body),
    onSuccess: () => {
      toast.success(t('toast.passwordChanged'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to change password'),
  });

  const handleProfileSave = (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error(t('toast.nameRequired'));
    profileMutation.mutate({ name: name.trim(), phone: phone.trim() });
  };

  const handlePasswordSave = (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return toast.error(t('toast.allPasswordFields'));
    if (newPassword.length < 6) return toast.error(t('toast.passwordMinLength'));
    if (newPassword !== confirmPassword) return toast.error(t('toast.passwordMismatch'));
    passwordMutation.mutate({ currentPassword, newPassword });
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{t('settings.title')}</h1>
        <p className="text-sm text-slate-500 mt-1">{t('settings.subtitle')}</p>
      </div>

      <Section title={t('settings.profile')} icon={User}>
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t('settings.fullName')} value={name} onChange={setName} placeholder={t('settings.yourName')} required />
            <Field label={t('settings.phone')} value={phone} onChange={setPhone} placeholder={t('settings.phoneNumber')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.email')}</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-400 cursor-not-allowed"
            />
            <p className="text-xs text-slate-400 mt-1">{t('settings.emailNote')}</p>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={profileMutation.isLoading}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
            >
              <Save size={15} />
              {profileMutation.isLoading ? t('common.saving') : t('settings.saveProfile')}
            </button>
          </div>
        </form>
      </Section>

      <Section title={t('settings.changePassword')} icon={Lock}>
        <form onSubmit={handlePasswordSave} className="space-y-4">
          <Field
            label={t('settings.currentPassword')}
            type="password"
            value={currentPassword}
            onChange={setCurrentPassword}
            placeholder={t('settings.enterCurrentPassword')}
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label={t('settings.newPassword')}
              type="password"
              value={newPassword}
              onChange={setNewPassword}
              placeholder={t('settings.minChars')}
              required
            />
            <Field
              label={t('settings.confirmNewPassword')}
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder={t('settings.repeatNewPassword')}
              required
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={passwordMutation.isLoading}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
            >
              <Save size={15} />
              {passwordMutation.isLoading ? t('common.saving') : t('settings.changePassword')}
            </button>
          </div>
        </form>
      </Section>
    </div>
  );
}
