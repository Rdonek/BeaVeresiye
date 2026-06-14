import React from 'react';
import { cn } from '@/shared/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, icon, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            "glass-input w-full",
            icon && "!pl-11",
            error && "border-danger focus:ring-danger/20",
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs text-danger font-medium ml-1">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
