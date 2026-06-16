import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: LucideIcon;
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  onAction,
  actionIcon: ActionIcon,
  className,
  ...props
}, ref) => {
  return (
    <div ref={ref} className={`h-full flex flex-col items-center justify-center text-center p-8 bg-transparent ${className}`} {...props}>
      <div className="w-20 h-20 bg-glass-highlight rounded-full flex items-center justify-center mb-4">
        <Icon className="w-10 h-10 text-text-tertiary" />
      </div>
      <h3 className="text-title-2 text-text-primary mb-2">{title}</h3>
      <p className="text-body text-text-secondary max-w-sm mb-6">
        {description}
      </p>

      {actionLabel && onAction && (
        <Button 
          onClick={onAction}
          variant="primary"
          size="md"
        >
          {ActionIcon && <ActionIcon className="w-5 h-5 mr-2" />}
          {actionLabel}
        </Button>
      )}
    </div>
  );
});
EmptyState.displayName = 'EmptyState';
