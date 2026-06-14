import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, LogOut } from 'lucide-react';
import { useAdminAuth } from '../providers/AdminAuthProvider';
import { motion } from 'framer-motion';
import { cn } from '@/shared/lib/utils';

export const AdminLayout = () => {
  const { signOut } = useAdminAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const navItems = [
    { to: '/admin', icon: LayoutDashboard, label: 'Özet', end: true },
    { to: '/admin/tenants', icon: Users, label: 'İşletmeler', end: false },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-system-bg">
      {/* Main Content */}
      <main className="flex-1 with-bottom-nav">
        <Outlet />
      </main>

      {/* Pill Bottom Navigation */}
      <div className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 w-[95%] max-w-md">
        <div className="bg-system-surface border border-system-muted/50 shadow-pill flex items-center justify-around rounded-full px-2 py-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => cn(
                "relative flex flex-col items-center justify-center w-14 h-12 transition-all duration-300",
                isActive ? "text-primary" : "text-text-tertiary hover:text-text-secondary"
              )}
            >
              {({ isActive }) => (
                <>
                  <motion.div
                    initial={false}
                    animate={{ y: isActive ? -4 : 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <item.icon className={cn("h-[22px] w-[22px]", isActive && "stroke-[2.5px]")} />
                  </motion.div>
                  
                  {isActive && (
                    <motion.div 
                      layoutId="admin-nav-indicator"
                      className="absolute -bottom-2 h-1 w-1 rounded-full bg-primary"
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
          
          {/* Sign Out Button directly in the pill */}
          <button
            onClick={handleSignOut}
            className="relative flex flex-col items-center justify-center w-14 h-12 transition-all duration-300 text-danger hover:text-danger/80"
          >
            <LogOut className="h-[22px] w-[22px]" />
          </button>
        </div>
      </div>
    </div>
  );
};
