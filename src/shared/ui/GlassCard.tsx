import React from 'react';
import { cn } from '@/shared/lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'card' | 'panel';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, children, variant = 'card', padding = 'md', ...props }, ref) => {
    
    const paddingClasses = {
      none: 'p-0',
      sm: 'p-3',
      md: 'p-5 lg:p-6',
      lg: 'p-8',
    };

    return (
      <div
        ref={ref}
        className={cn(
          variant === 'card' ? 'glass-card' : 'glass-panel',
          paddingClasses[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassCard.displayName = 'GlassCard';
