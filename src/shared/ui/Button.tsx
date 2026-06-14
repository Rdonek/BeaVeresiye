import React from 'react';
import { cn } from '@/shared/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'glass' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon' | 'default';
  isLoading?: boolean;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading = false, fullWidth = false, children, disabled, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center rounded-md font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-50 active:translate-y-[1px]";
    
    const variants = {
      primary: "glass-button-primary",
      glass: "glass-button",
      secondary: "bg-white text-text-primary hover:bg-gray-50 border border-gray-300 shadow-sm",
      danger: "bg-danger text-white shadow-sm hover:bg-danger/90",
      ghost: "hover:bg-gray-100 text-text-primary",
      outline: "border border-primary text-primary hover:bg-primary/10",
    };

    const sizes = {
      sm: "h-10 px-4 text-xs rounded-lg",
      md: "h-11 px-6 text-sm rounded-xl",
      lg: "h-14 px-8 text-base rounded-2xl",
      icon: "h-11 w-11 rounded-xl",
      default: "h-11 px-6 text-sm rounded-xl",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], fullWidth && "w-full", className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
