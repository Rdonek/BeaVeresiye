import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminAuthProvider, useAdminAuth } from './providers/AdminAuthProvider';
import { AdminLayout } from './widgets/AdminLayout';
import { AdminLogin } from './pages/AdminLogin';
import { AdminDashboard } from './pages/AdminDashboard';
import { TenantsList } from './pages/TenantsList';
import { CreateTenant } from './pages/CreateTenant';
import { TenantDetail } from './pages/TenantDetail';
import '@/app/styles/global.css';

const AdminProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAdminAuth();
  if (isLoading) return <div className="flex h-screen items-center justify-center bg-system-bg font-subhead text-text-tertiary">Yükleniyor...</div>;
  if (!user) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
};

export const AdminApp = () => {
  return (
    <BrowserRouter>
      <AdminAuthProvider>
        <Routes>
          <Route path="/admin/login" element={<AdminLogin />} />
          
          <Route path="/admin" element={<AdminProtectedRoute><AdminLayout /></AdminProtectedRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="tenants" element={<TenantsList />} />
            <Route path="tenants/new" element={<CreateTenant />} />
            <Route path="tenants/:id" element={<TenantDetail />} />
          </Route>

          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </AdminAuthProvider>
    </BrowserRouter>
  );
};
