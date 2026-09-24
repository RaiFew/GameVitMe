import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'outline' | 'subtle' | 'success' | 'danger';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white',
    outline: 'bg-transparent text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700',
    subtle: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800/80 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700',
    success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30',
    danger: 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/30',
  };

  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold rounded-xs', variants[variant], className)}>
      {children}
    </span>
  );
}
