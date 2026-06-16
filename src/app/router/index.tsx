import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import React from 'react';

// Providers
import { AuthProvider } from '@/app/providers/AuthProvider';
import { TenantProvider } from '@/app/providers/TenantProvider';
import { AdminAuthProvider } from '@/admin/providers/AdminAuthProvider';

// Guards & Layouts
import { Layout } from '@/widgets/Layout';
import { AdminLayout } from '@/admin/widgets/AdminLayout';
import { ProtectedRoute, PermissionGuard } from './guards';
import { AdminProtectedRoute } from './adminGuards';

// Pages - App
import { Login } from '@/pages/Login';
import { Onboarding } from '@/pages/Onboarding';
import { Dashboard } from '@/pages/Dashboard';
import { Pos } from '@/pages/Pos';
import { Inventory } from '@/pages/Inventory';
import { Customers } from '@/pages/Customers';
import { Suppliers } from '@/pages/Suppliers';
import { Settings } from '@/pages/Settings';
import { Employees } from '@/pages/Employees';
import { Transactions } from '@/pages/Transactions';
import { History } from '@/pages/History';
import { NotFound } from '@/pages/NotFound';

// Pages - Admin
import { AdminLogin } from '@/admin/pages/AdminLogin';
import { AdminDashboard } from '@/admin/pages/AdminDashboard';
import { TenantsList } from '@/admin/pages/TenantsList';
import { CreateTenant } from '@/admin/pages/CreateTenant';
import { TenantDetail } from '@/admin/pages/TenantDetail';

export const router = createBrowserRouter([
  // ---------------------------------------------------------
  // APP ROUTES (Customer Facing)
  // ---------------------------------------------------------
  {
    path: '/',
    element: (
      <AuthProvider>
        <TenantProvider>
          <Outlet />
        </TenantProvider>
      </AuthProvider>
    ),
    children: [
      {
        path: 'login',
        element: <Login />,
      },
      {
        path: 'onboarding',
        element: (
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        ),
      },
      {
        path: '',
        element: (
          <ProtectedRoute requireTenant>
            <Layout />
          </ProtectedRoute>
        ),
        children: [
          {
            index: true,
            element: <PermissionGuard permission="dashboard"><Dashboard /></PermissionGuard>
          },
          {
            path: 'pos',
            element: <PermissionGuard permission="pos"><Pos /></PermissionGuard>
          },
          {
            path: 'inventory',
            element: <PermissionGuard permission="inventory"><Inventory /></PermissionGuard>
          },
          {
            path: 'customers',
            element: <PermissionGuard permission="customers"><Customers /></PermissionGuard>
          },
          {
            path: 'suppliers',
            element: <PermissionGuard permission="customers"><Suppliers /></PermissionGuard>
          },
          {
            path: 'settings',
            element: <Settings />
          },
          {
            path: 'settings/employees',
            element: <Employees />
          },
          {
            path: 'transactions',
            element: <PermissionGuard permission="dashboard"><Transactions /></PermissionGuard>
          },
          {
            path: 'history',
            element: <PermissionGuard permission="dashboard"><History /></PermissionGuard>
          }
        ]
      }
    ]
  },

  // ---------------------------------------------------------
  // ADMIN ROUTES (Superadmin Facing)
  // ---------------------------------------------------------
  {
    path: '/admin',
    element: (
      <AdminAuthProvider>
        <Outlet />
      </AdminAuthProvider>
    ),
    children: [
      {
        path: 'login',
        element: <AdminLogin />,
      },
      {
        path: '',
        element: (
          <AdminProtectedRoute>
            <AdminLayout />
          </AdminProtectedRoute>
        ),
        children: [
          {
            index: true,
            element: <AdminDashboard />
          },
          {
            path: 'tenants',
            element: <TenantsList />
          },
          {
            path: 'tenants/new',
            element: <CreateTenant />
          },
          {
            path: 'tenants/:id',
            element: <TenantDetail />
          }
        ]
      }
    ]
  },

  // ---------------------------------------------------------
  // 404 NOT FOUND
  // ---------------------------------------------------------
  {
    path: '*',
    element: <NotFound />
  }
]);
