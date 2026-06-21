import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const titleKeys = [
  '/', '/properties', '/rooms', '/room-map', '/tenants', '/rent', '/deposits',
  '/electricity', '/complaints', '/visitors', '/expenses', '/staff',
  '/inventory', '/notices', '/reports',
];

export default function AppLayout() {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const title = titleKeys.includes(pathname) ? t(`pageTitles.${pathname}`) : 'PG Admin';

  return (
    <div className="flex">
      <Sidebar />
      <div className="ml-60 flex-1 flex flex-col min-h-screen">
        <TopBar title={title} />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
