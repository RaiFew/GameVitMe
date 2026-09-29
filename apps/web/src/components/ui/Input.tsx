import { forwardRef, InputHTMLAttributes, ReactNode, useId } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, id, ...props }, ref) => {
    // useId, not Math.random: a random id changes on every render and breaks
    // the label's htmlFor association.
    const generatedId = useId();
    const inputId = id || generatedId;

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="block text-label text-ink-muted font-medium">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-ink-faint">
              {icon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            aria-invalid={error ? true : undefined}
            className={cn(
              'flex h-10 w-full rounded-xs border border-rule bg-surface px-3 text-body text-ink',
              'placeholder:text-ink-faint transition-colors',
              'hover:border-ink-faint focus:border-ink',
              'disabled:cursor-not-allowed disabled:opacity-40',
              icon && 'pl-9',
              error && 'border-danger focus:border-danger',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-label text-danger">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
