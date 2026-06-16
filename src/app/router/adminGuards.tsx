import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '@/admin/providers/AdminAuthProvider';

export const AdminProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAdminAuth();
  const location = useLocation();

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-system-bg font-subhead text-text-tertiary">Yükleniyor...</div>;
  
  if (!user) return <Navigate to="/admin/login" replace state={{ from: location }} />;
  
  return <>{children}</>;
};
