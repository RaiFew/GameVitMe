import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** 'live' is the single accent surface, for the player on turn. */
  tone?: 'default' | 'sunk' | 'outline' | 'live';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, tone = 'default', ...props }, ref) => {
    const tones = {
      default: 'bg-surface border border-rule',
      sunk: 'bg-canvas-sunk border border-transparent',
      outline: 'bg-transparent border border-rule',
      live: 'bg-surface border border-live',
    };

    return (
      <div
        ref={ref}
        className={cn('rounded-xs p-6 text-ink transition-colors', tones[tone], className)}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';
