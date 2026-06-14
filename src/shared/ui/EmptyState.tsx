import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: LucideIcon;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  onAction,
  actionIcon: ActionIcon
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 h-full min-h-[300px] text-center bg-white rounded-3xl border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex-1">
      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
        <Icon className="w-10 h-10 text-gray-300" />
      </div>
      
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-[15px] font-medium text-gray-500 max-w-sm mb-8 leading-relaxed">
        {description}
      </p>

      {actionLabel && onAction && (
        <button 
          onClick={onAction}
          className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold px-6 py-3.5 rounded-2xl transition-all hover:scale-105 shadow-lg shadow-primary/25 active:scale-95"
        >
          {ActionIcon && <ActionIcon className="w-5 h-5" />}
          {actionLabel}
        </button>
      )}
    </div>
  );
};
