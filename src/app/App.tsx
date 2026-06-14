import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TenantProvider, useTenant } from './providers/TenantProvider';
import { AuthProvider, useAuth } from './providers/AuthProvider';
import { Layout } from '@/widgets/Layout';
import { Dashboard } from '@/pages/Dashboard';
import { Pos } from '@/pages/Pos';
import { Inventory } from '@/pages/Inventory';
import { Customers } from '@/pages/Customers';
import { Settings } from '@/pages/Settings';
import { Employees } from '@/pages/Employees';
import { Login } from '@/pages/Login';
import { Onboarding } from '@/pages/Onboarding';
import { Suppliers } from '@/pages/Suppliers';
import { Transactions } from '@/pages/Transactions';
import './styles/global.css';

const ProtectedRoute = ({ children, requireTenant = false }: { children: React.ReactNode, requireTenant?: boolean }) => {
  const { user, isLoading } = useAuth();
  const { tenantId, isLoading: isTenantLoading } = useTenant();

  if (isLoading || isTenantLoading) return <div className="flex h-screen items-center justify-center bg-system-bg font-subhead text-text-tertiary">Yükleniyor...</div>;
  
  if (!user) return <Navigate to="/login" replace />;
  
  if (requireTenant && !tenantId) return <Navigate to="/onboarding" replace />;
  
  // If user already has a tenant, they shouldn't see the onboarding page
  if (window.location.pathname === '/onboarding' && tenantId) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

const PermissionGuard = ({ children, permission }: { children: React.ReactNode, permission: 'pos' | 'inventory' | 'customers' | 'dashboard' }) => {
  const { user } = useAuth();
  if (user?.type === 'owner') return <>{children}</>;
  if (user?.type === 'employee' && user?.permissions?.[permission]) return <>{children}</>;
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-system-bg p-6 text-center pb-32">
      <div className="rounded-2xl bg-danger/10 p-6 max-w-sm w-full border border-danger/20">
        <h2 className="mb-2 font-large-title text-danger">Yetkisiz Erişim</h2>
        <p className="font-subhead text-text-secondary">Bu sayfayı görüntülemek için yetkiniz bulunmuyor. Lütfen işletme sahibinden yetki isteyin.</p>
      </div>
    </div>
  );
};

export const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TenantProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            
            {/* Protected Routes wrapped in Layout */}
            <Route path="/" element={<ProtectedRoute requireTenant><Layout /></ProtectedRoute>}>
              <Route index element={<PermissionGuard permission="dashboard"><Dashboard /></PermissionGuard>} />
              <Route path="pos" element={<PermissionGuard permission="pos"><Pos /></PermissionGuard>} />
              <Route path="inventory" element={<PermissionGuard permission="inventory"><Inventory /></PermissionGuard>} />
              <Route path="customers" element={<PermissionGuard permission="customers"><Customers /></PermissionGuard>} />
              <Route path="suppliers" element={<PermissionGuard permission="customers"><Suppliers /></PermissionGuard>} />
              <Route path="settings" element={<Settings />} />
              <Route path="settings/employees" element={<Employees />} />
              <Route path="transactions" element={<PermissionGuard permission="dashboard"><Transactions /></PermissionGuard>} />
            </Route>

            {/* Standalone Protected Routes (No Tabbar Layout) */}

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </TenantProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
