import React from 'react';
import { cn } from '@/shared/lib/utils';

export interface FilterChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  isActive: boolean;
  icon?: React.ReactNode;
}

export const FilterChip = React.forwardRef<HTMLButtonElement, FilterChipProps>(
  ({ label, isActive, icon, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
      onClick={props.onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-caption font-semibold transition-all border whitespace-nowrap',
        'active:scale-[0.97]',
        isActive
          ? 'bg-primary border-primary text-white shadow-sm'
          : 'bg-system-surface border-system-border text-text-secondary hover:border-primary/50 hover:bg-glass-highlight',
        className
      )}
      {...props}
    >
      {icon && <span className="flex-shrink-0 [&>svg]:w-3.5 [&>svg]:h-3.5">{icon}</span>}
      {label}
    </button>
  );
});
FilterChip.displayName = 'FilterChip';
