import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'live';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center gap-2 rounded-xs font-semibold transition-colors ' +
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-live ' +
      'active:translate-y-px disabled:opacity-40 disabled:pointer-events-none cursor-pointer';

    const variants = {
      primary: 'bg-ink text-canvas hover:opacity-90 border border-transparent',
      secondary: 'bg-canvas text-ink border border-rule hover:bg-surface-hover hover:border-ink',
      outline: 'bg-transparent text-ink border border-rule hover:border-ink hover:bg-surface-hover',
      danger: 'bg-transparent text-danger border border-danger/40 hover:bg-danger/10',
      ghost: 'bg-transparent text-ink-muted border border-transparent hover:text-ink hover:bg-surface-hover',
      // The one accent surface: your turn, right now.
      live: 'bg-live text-live-ink border border-transparent hover:opacity-90',
    };

    // Sentence case, not tracked-out caps. Caps come back only where the text
    // is a fixed short label, which is what caps are actually for.
    const sizes = {
      sm: 'h-8 px-3 text-label',
      md: 'h-10 px-4 text-label',
      lg: 'h-12 px-6 text-body font-bold',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
