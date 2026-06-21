import { NavLink } from 'react-router-dom';
import logo from '../../assets/web-logo-light.png';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Building2, BedDouble, Users, Banknote,
  Shield, Zap, MessageSquare, UserCheck, DollarSign,
  Users2, Package, Bell, BarChart3, Settings, LogOut, UserPlus, Map, Hotel,
  CreditCard, ClipboardList, SlidersHorizontal
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const ownerNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/properties', icon: Building2, label: 'Properties' },
  { to: '/rooms', icon: BedDouble, label: 'Rooms' },
  { to: '/room-map', icon: Map, label: 'Room Map' },
  { to: '/tenants', icon: Users, label: 'Tenants' },
  { to: '/rent', icon: Banknote, label: 'Rent' },
  { to: '/deposits', icon: Shield, label: 'Deposits' },
  { to: '/electricity', icon: Zap, label: 'Electricity' },
  { to: '/complaints', icon: MessageSquare, label: 'Complaints' },
  { to: '/visitors', icon: UserCheck, label: 'Visitors' },
  { to: '/guests', icon: Hotel, label: 'Guests' },
  { to: '/expenses', icon: DollarSign, label: 'Expenses' },
  { to: '/staff', icon: Users2, label: 'Staff' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/notices', icon: Bell, label: 'Notices' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/leads', icon: UserPlus, label: 'Leads' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const superadminNavItems = [
  { to: '/superadmin', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/superadmin/owners', icon: Users2, label: 'Owners' },
  { to: '/superadmin/subscriptions', icon: CreditCard, label: 'Subscriptions' },
  { to: '/superadmin/properties', icon: Building2, label: 'Properties' },
  { to: '/superadmin/tenants', icon: Users, label: 'Tenants' },
  { to: '/superadmin/rent-records', icon: Banknote, label: 'Rent Records' },
  { to: '/superadmin/complaints', icon: MessageSquare, label: 'Complaints' },
  { to: '/superadmin/audit-logs', icon: ClipboardList, label: 'Audit Logs' },
  { to: '/superadmin/settings', icon: SlidersHorizontal, label: 'App Settings' },
];

export default function Sidebar() {
  const { logout, user } = useAuth();
  const { t } = useTranslation();
  const isSuperadmin = user?.role === 'superadmin';
  const navItems = isSuperadmin ? superadminNavItems : ownerNavItems;

  return (
    <aside className="w-60 h-screen bg-slate-900 text-white flex flex-col fixed top-0 left-0 z-40">
      <div className="px-5 py-5 border-b border-slate-700">
        <img src={logo} alt="PGKamalik" className="h-10 w-auto" />
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {navItems.map(({ to, icon: Icon, key, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/' || to === '/superadmin'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg mb-0.5 text-sm transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <Icon size={17} />
            {label ?? t(`nav.${key}`)}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-700">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut size={17} />
          {t('nav.logout')}
        </button>
      </div>
    </aside>
  );
}
