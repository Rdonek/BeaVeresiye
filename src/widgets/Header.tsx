import React, { useEffect } from 'react';
import { ChevronLeft, Menu } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/shared/store/uiStore';
import { useTenant } from '@/app/providers/TenantProvider';

export interface HeaderProps {
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
  backTo?: string;
}

// 1. Pages use this component invisibly to set the header state
export const Header = ({ title, subtitle, rightElement, backTo }: HeaderProps) => {
  const setHeader = useUIStore((state) => state.setHeader);

  useEffect(() => {
    setHeader(title, subtitle, rightElement, backTo);
    return () => setHeader('Yükleniyor...', '', undefined, undefined); // cleanup
  }, [title, subtitle, rightElement, backTo, setHeader]);

  return null; // This component doesn't render anything directly
};

// 2. Layout uses this component to actually render the global header
export const AppHeader = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tenantName } = useTenant();
  const { toggleSidebar, headerTitle, headerSubtitle, headerRightElement, headerBackTo } = useUIStore();
  
  return (
    <header className="shrink-0 z-40 bg-system-bg/90 backdrop-blur-md border-b border-system-border/50">
      <div className="flex items-center justify-between min-h-[64px] px-4 sm:px-6 lg:px-8 py-3 max-w-7xl mx-auto w-full">
        {/* Left Action & Title */}
        <div className="flex items-center justify-start flex-1 min-w-0">
          <div className="flex items-center gap-3">
            {headerBackTo ? (
              <button 
                onClick={() => navigate(headerBackTo)}
                className="w-10 h-10 flex items-center justify-center text-text-secondary hover:bg-glass-highlight rounded-full transition-colors flex-shrink-0"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            ) : (
              <button 
                onClick={toggleSidebar}
                className="w-10 h-10 flex lg:hidden items-center justify-center text-text-secondary hover:bg-glass-highlight rounded-full transition-colors flex-shrink-0 -ml-2"
              >
                <Menu className="w-6 h-6" />
              </button>
            )}
            
            <div className="flex flex-col min-w-0">
              <h1 className="text-title-2 font-bold text-text-primary tracking-tight truncate flex items-center gap-2">
                <span className="lg:hidden text-primary text-body">🏪</span>
                {headerTitle}
              </h1>
              {headerSubtitle && (
                <p className="text-body font-medium text-text-secondary truncate mt-0.5">{headerSubtitle}</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Right Action */}
        <div className="flex items-center justify-end min-w-max pl-4">
          {headerRightElement && headerRightElement}
        </div>
      </div>
    </header>
  );
};
