import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useUIStore } from '@/shared/store/uiStore';

export const Layout = () => {
  const { isSidebarOpen, closeSidebar } = useUIStore();

  return (
    <div className="flex min-h-screen w-full relative bg-gray-100">
      <Sidebar />
      
      {/* Mobile Drawer Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={closeSidebar}
        />
      )}

      <main className="flex-1 w-full lg:pl-[260px] flex flex-col transition-all duration-300">
        <div className="flex-1 pt-6 lg:pt-10 pb-8 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
