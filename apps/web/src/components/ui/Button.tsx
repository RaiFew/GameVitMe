import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium tracking-tight transition-all focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2 focus:ring-offset-transparent active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none cursor-pointer rounded-xs';
    
    const variants = {
      primary: 'bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 border border-black dark:border-white shadow-xs',
      secondary: 'bg-white text-black hover:bg-zinc-100 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800 border border-zinc-300 dark:border-zinc-700',
      outline: 'bg-transparent text-black dark:text-white border border-black dark:border-white hover:bg-black/5 dark:hover:bg-white/10',
      danger: 'bg-transparent text-red-600 dark:text-red-400 border border-red-600 dark:border-red-500 hover:bg-red-50 dark:hover:bg-red-950/30',
      ghost: 'bg-transparent text-zinc-600 hover:text-black hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 border border-transparent'
    };

    const sizes = {
      sm: 'h-9 px-3 text-xs uppercase tracking-wider font-semibold',
      md: 'h-11 px-5 text-sm uppercase tracking-wider font-semibold',
      lg: 'h-13 px-7 text-base uppercase tracking-wider font-bold'
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
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
