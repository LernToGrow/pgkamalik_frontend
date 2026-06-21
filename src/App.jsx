import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PropertyProvider } from './context/PropertyContext';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import SuperadminDashboard from './pages/SuperadminDashboard';
import SuperadminOwners from './pages/superadmin/Owners';
import SuperadminSubscriptions from './pages/superadmin/Subscriptions';
import SuperadminProperties from './pages/superadmin/Properties';
import SuperadminTenants from './pages/superadmin/Tenants';
import SuperadminRentRecords from './pages/superadmin/RentRecords';
import SuperadminComplaints from './pages/superadmin/Complaints';
import SuperadminAuditLogs from './pages/superadmin/AuditLogs';
import SuperadminAppSettings from './pages/superadmin/AppSettings';
import Properties from './pages/Properties';
import Rooms from './pages/Rooms';
import Tenants from './pages/Tenants';
import Rent from './pages/Rent';
import Deposits from './pages/Deposits';
import Electricity from './pages/Electricity';
import Complaints from './pages/Complaints';
import Visitors from './pages/Visitors';
import Expenses from './pages/Expenses';
import Staff from './pages/Staff';
import Inventory from './pages/Inventory';
import Notices from './pages/Notices';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Leads from './pages/Leads';
import VacancyPage from './pages/VacancyPage';
import RoomMap from './pages/RoomMap';
import Guests from './pages/Guests';

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30000 } } });

function SuperadminRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'superadmin') return <Navigate to="/" replace />;
  return children;
}

function OwnerRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'superadmin') return <Navigate to="/superadmin" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={user.role === 'superadmin' ? '/superadmin' : '/'} replace /> : <Login />} />
      <Route path="/signup" element={user ? <Navigate to="/" replace /> : <Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/vacancies/:ownerId" element={<VacancyPage />} />

      {/* Superadmin routes */}
      <Route path="/superadmin" element={<SuperadminRoute><AppLayout /></SuperadminRoute>}>
        <Route index element={<SuperadminDashboard />} />
        <Route path="owners" element={<SuperadminOwners />} />
        <Route path="subscriptions" element={<SuperadminSubscriptions />} />
        <Route path="properties" element={<SuperadminProperties />} />
        <Route path="tenants" element={<SuperadminTenants />} />
        <Route path="rent-records" element={<SuperadminRentRecords />} />
        <Route path="complaints" element={<SuperadminComplaints />} />
        <Route path="audit-logs" element={<SuperadminAuditLogs />} />
        <Route path="settings" element={<SuperadminAppSettings />} />
      </Route>

      {/* Owner routes */}
      <Route path="/" element={<OwnerRoute><AppLayout /></OwnerRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="properties" element={<Properties />} />
        <Route path="rooms" element={<Rooms />} />
        <Route path="tenants" element={<Tenants />} />
        <Route path="rent" element={<Rent />} />
        <Route path="deposits" element={<Deposits />} />
        <Route path="electricity" element={<Electricity />} />
        <Route path="complaints" element={<Complaints />} />
        <Route path="visitors" element={<Visitors />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="staff" element={<Staff />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="notices" element={<Notices />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
        <Route path="leads" element={<Leads />} />
        <Route path="room-map" element={<RoomMap />} />
        <Route path="guests" element={<Guests />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <PropertyProvider>
          <BrowserRouter>
            <AppRoutes />
            <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
          </BrowserRouter>
        </PropertyProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
