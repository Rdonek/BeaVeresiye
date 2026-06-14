import React from 'react';
import { ChevronLeft, Menu } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/shared/store/uiStore';

interface HeaderProps {
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
  backTo?: string;
}

export const Header = ({ title, rightElement, backTo }: HeaderProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toggleSidebar } = useUIStore();
  
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between min-h-[56px] bg-gray-100/90 backdrop-blur-md border-b border-gray-200/50 mb-6 w-auto -mx-4 sm:-mx-6 lg:-mx-10 px-4 sm:px-6 lg:px-10 -mt-6 lg:-mt-10 pt-6 lg:pt-10 pb-4">
      {/* Left Action */}
      <div className="flex items-center justify-start min-w-[80px]">
        {backTo ? (
          <button 
            onClick={() => navigate(backTo)}
            className="w-10 h-10 flex items-center justify-center text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        ) : (
          <button 
            onClick={toggleSidebar}
            className="w-10 h-10 flex lg:hidden items-center justify-center text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Center Title Area */}
      <div className="flex flex-col items-center justify-center text-center px-4 flex-1 min-w-0">
        <h1 className="text-[15px] font-bold text-gray-900 tracking-tight truncate w-full flex items-center justify-center gap-1.5">
          <span className="w-5 h-5 bg-primary/10 text-primary rounded flex items-center justify-center text-[11px]">🏪</span>
          {user?.name || 'İşletmem'}
        </h1>
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider truncate w-full mt-0.5">{title}</p>
      </div>
      
      {/* Right Action */}
      <div className="flex items-center justify-end min-w-[80px]">
        {rightElement && rightElement}
      </div>
    </header>
  );
};
