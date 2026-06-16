import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { useTenant } from '@/app/providers/TenantProvider';

export const ProtectedRoute = ({ children, requireTenant = false }: { children: React.ReactNode, requireTenant?: boolean }) => {
  const { user, isLoading } = useAuth();
  const { tenantId, isLoading: isTenantLoading } = useTenant();
  const location = useLocation();

  if (isLoading || isTenantLoading) return <div className="flex h-screen items-center justify-center bg-system-bg font-subhead text-text-tertiary">Yükleniyor...</div>;
  
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  
  if (requireTenant && !tenantId) {
    if (user.type === 'employee') {
      return (
        <div className="flex h-screen flex-col items-center justify-center bg-system-bg p-6 text-center">
          <div className="rounded-2xl bg-danger/10 p-6 max-w-sm w-full border border-danger/20">
            <h2 className="mb-2 font-large-title text-danger">İşletme Bulunamadı</h2>
            <p className="font-subhead text-text-secondary">Bağlı olduğunuz işletme bulunamadı veya bu işletmeye erişim yetkiniz yok.</p>
          </div>
        </div>
      );
    }
    return <Navigate to="/onboarding" replace />;
  }
  
  // If user already has a tenant, they shouldn't see the onboarding page
  if (location.pathname === '/onboarding' && tenantId) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

export const PermissionGuard = ({ children, permission }: { children: React.ReactNode, permission: 'pos' | 'inventory' | 'customers' | 'dashboard' }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (user?.type === 'owner') return <>{children}</>;
  if (user?.type === 'employee' && user?.permissions?.[permission]) return <>{children}</>;
  
  // Graceful redirection for employees clicking the home logo
  if (permission === 'dashboard' && location.pathname === '/') {
    const p = user?.permissions;
    if (p?.pos) return <Navigate to="/pos" replace />;
    if (p?.inventory) return <Navigate to="/inventory" replace />;
    if (p?.customers) return <Navigate to="/customers" replace />;
    return <Navigate to="/settings" replace />;
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-system-bg p-6 text-center pb-32">
      <div className="rounded-2xl bg-danger/10 p-6 max-w-sm w-full border border-danger/20">
        <h2 className="mb-2 font-large-title text-danger">Yetkisiz Erişim</h2>
        <p className="font-subhead text-text-secondary">Bu sayfayı görüntülemek için yetkiniz bulunmuyor. Lütfen işletme sahibinden yetki isteyin.</p>
      </div>
    </div>
  );
};
