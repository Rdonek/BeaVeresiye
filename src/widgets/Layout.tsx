import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { AppHeader } from './Header';
import { useUIStore } from '@/shared/store/uiStore';

export const Layout = () => {
  const { isSidebarOpen, closeSidebar } = useUIStore();

  return (
    <div className="flex h-[100dvh] w-full relative bg-system-bg overflow-hidden">
      <Sidebar />
      
      {/* Mobile Drawer Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={closeSidebar}
        />
      )}

      <main className="flex-1 w-full lg:pl-[280px] flex flex-col transition-all duration-300 h-[100dvh] overflow-hidden">
        <AppHeader />
        <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col pt-6 pb-8 min-h-0 overflow-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
