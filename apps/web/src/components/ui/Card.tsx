import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'subtle' | 'bordered';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100',
      subtle: 'bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 text-zinc-900 dark:text-zinc-100',
      bordered: 'bg-white dark:bg-zinc-950 border-2 border-black dark:border-white text-zinc-900 dark:text-zinc-100',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xs p-6 transition-colors',
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';
