import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'outline' | 'subtle' | 'success' | 'danger' | 'live';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-ink text-canvas',
    outline: 'text-ink border border-rule',
    subtle: 'bg-surface-hover text-ink-muted',
    success: 'text-ink-muted border border-success/30 bg-success/10',
    danger: 'text-danger border border-danger/30 bg-danger/10',
    live: 'bg-live text-live-ink',
  };

  return (
    <span
      className={cn(
        // Small fixed labels are the one place caps still earn their keep.
        'inline-flex items-center px-1.5 py-0.5 font-mono text-micro uppercase font-semibold rounded-xs',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
