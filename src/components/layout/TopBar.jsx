import { useAuth } from '../../context/AuthContext';
import { useProperty } from '../../context/PropertyContext';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { User } from 'lucide-react';
import api from '../../api/axios';

export default function TopBar({ title }) {
  const { user } = useAuth();
  const { propertyId, setPropertyId } = useProperty();
  const { t, i18n } = useTranslation();

  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: () => api.get('/properties', { params: { limit: 100 } }).then((r) => r.data.data.properties),
    enabled: !!user,
  });

  const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिंदी' },
    { code: 'kn', label: 'ಕನ್ನಡ' },
    { code: 'te', label: 'తెలుగు' },
  ];

  const currentLang = LANGUAGES.find((l) => i18n.language.startsWith(l.code)) || LANGUAGES[0];

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6">
      <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
      <div className="flex items-center gap-3">
        {properties?.length > 1 && (
          <select
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 text-slate-700"
          >
            <option value="">{t('topbar.allProperties')}</option>
            {properties.map((p) => (
              <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </select>
        )}
        <select
          value={currentLang.code}
          onChange={(e) => i18n.changeLanguage(e.target.value)}
          className="text-xs font-medium px-2.5 py-1 rounded-full border border-slate-300 text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white transition-colors"
          title="Switch language"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <User size={16} />
          <span>{user?.name || user?.email || 'Admin'}</span>
        </div>
      </div>
    </header>
  );
}
