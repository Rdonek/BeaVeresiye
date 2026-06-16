import React from 'react';
import { cn } from '@/shared/lib/utils';

export interface FilterChipProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export const FilterChip = ({ label, isActive, onClick, icon, className }: FilterChipProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all border whitespace-nowrap',
        'active:scale-[0.97]',
        isActive
          ? 'bg-primary border-primary text-white shadow-sm'
          : 'bg-white border-gray-200 text-text-secondary hover:border-gray-300 hover:bg-gray-50',
        className
      )}
    >
      {icon && <span className="flex-shrink-0 [&>svg]:w-3.5 [&>svg]:h-3.5">{icon}</span>}
      {label}
    </button>
  );
};
