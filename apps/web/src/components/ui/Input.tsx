import { forwardRef, InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, id, ...props }, ref) => {
    const inputId = id || Math.random().toString(36).slice(2, 9);
    
    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="block text-xs uppercase tracking-wider font-semibold text-zinc-600 dark:text-zinc-400">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-zinc-400 dark:text-zinc-500">
              {icon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              "flex h-11 w-full rounded-xs border bg-white dark:bg-zinc-950 px-3.5 py-2 text-sm text-black dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600",
              "border-zinc-300 dark:border-zinc-700 focus:outline-none focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black dark:focus:ring-white transition-colors",
              "disabled:cursor-not-allowed disabled:opacity-40",
              icon && "pl-10",
              error && "border-red-600 dark:border-red-500 focus:border-red-600 dark:focus:border-red-500 focus:ring-red-600",
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="text-xs font-medium text-red-600 dark:text-red-400 tracking-tight">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
