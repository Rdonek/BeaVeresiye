import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Calculator, PackageSearch, Users, Settings as SettingsIcon, BarChart3, Receipt, Truck, X, List } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { cn } from '@/shared/lib/utils';
import { motion } from 'framer-motion';
import { useUIStore } from '@/shared/store/uiStore';
import { useTenant } from '@/app/providers/TenantProvider';

export const Sidebar = () => {
  const { user } = useAuth();
  const { tenantName, ownerName } = useTenant();
  const { isSidebarOpen, closeSidebar } = useUIStore();

  const allNavItems = [
    { to: '/', icon: Home, label: 'Özet', requiredPerm: 'dashboard' as const },
    { to: '/transactions', icon: Receipt, label: 'Kasa ve Masraflar', requiredPerm: 'dashboard' as const },
    { to: '/history', icon: List, label: 'İşlem Geçmişi', requiredPerm: 'dashboard' as const },
    { to: '/pos', icon: Calculator, label: 'Hızlı Satış', requiredPerm: 'pos' as const },
    { to: '/inventory', icon: PackageSearch, label: 'Stok Yönetimi', requiredPerm: 'inventory' as const },
    { to: '/customers', icon: Users, label: 'Veresiye Defteri', requiredPerm: 'customers' as const },
    { to: '/suppliers', icon: Truck, label: 'Toptancılar', requiredPerm: 'customers' as const },
    { to: '/settings', icon: SettingsIcon, label: 'Ayarlar', requiredPerm: null },
  ];

  const navItems = allNavItems.filter(item => {
    if (user?.type === 'owner') return true;
    if (item.requiredPerm === null) return true;
    return user?.permissions?.[item.requiredPerm];
  });

  const sidebarClasses = cn(
    "fixed top-0 bottom-0 left-0 z-50 w-[280px] bg-white border-r border-gray-200 shadow-xl lg:shadow-none transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col",
    isSidebarOpen ? "translate-x-0" : "-translate-x-full"
  );

  return (
    <aside className={sidebarClasses}>
      <div className="flex items-center justify-between px-6 py-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <img src="/bidefter_icon.svg" alt="Bidefter Logo" className="w-10 h-10 rounded-[14px] shadow-sm" />
          <div>
            <h2 className="font-bold text-gray-900 tracking-tight text-lg leading-tight">Bidefter</h2>
            <p className="text-xs text-gray-500 font-medium truncate max-w-[140px]">{tenantName}</p>
          </div>
        </div>
        <button onClick={closeSidebar} className="lg:hidden p-2 text-gray-400 hover:text-gray-600 rounded-lg bg-gray-50">
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar">
        <nav className="flex flex-col gap-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => closeSidebar()}
              className={({ isActive }) => cn(
                "relative flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group overflow-hidden",
                isActive ? "bg-primary/5 text-primary font-bold" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-semibold"
              )}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active-indicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-primary rounded-r-full"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <item.icon className={cn("w-5 h-5 relative z-10 transition-colors", isActive ? "text-primary" : "text-gray-400 group-hover:text-gray-600")} />
                  <span className="relative z-10 text-[15px]">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="p-4 border-t border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
            {user?.type === 'owner' && ownerName ? ownerName.substring(0, 2).toUpperCase() : user?.name ? user.name.substring(0, 2).toUpperCase() : user?.email ? user.email.substring(0, 2).toUpperCase() : 'US'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">
              {user?.type === 'owner' ? (ownerName || user?.name || user?.email?.split('@')[0] || 'Kullanıcı') : (user?.name || 'Personel')}
            </p>
            <p className="text-xs text-gray-500 truncate capitalize">{user?.type === 'owner' ? 'Yönetici' : 'Personel'}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
