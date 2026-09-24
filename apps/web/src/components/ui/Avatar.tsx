import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface AvatarProps {
  src?: string;
  fallback: string;
  status?: 'online' | 'offline' | 'in_game' | 'away';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ src, fallback, status, size = 'md', className }, ref) => {
    const sizes = {
      sm: 'h-8 w-8 text-xs',
      md: 'h-10 w-10 text-sm',
      lg: 'h-14 w-14 text-base font-bold'
    };

    return (
      <div ref={ref} className={cn("relative inline-block shrink-0", className)}>
        <div className={cn("overflow-hidden rounded-xs border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center font-bold text-zinc-900 dark:text-zinc-100 uppercase select-none", sizes[size])}>
          {src ? (
            <img src={src} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <span>{fallback.substring(0, 2).toUpperCase()}</span>
          )}
        </div>
        {status && (
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 block rounded-full ring-2 ring-white dark:ring-zinc-950",
              status === 'online' ? 'bg-emerald-500' : status === 'offline' ? 'bg-zinc-400' : 'bg-amber-500',
              size === 'sm' ? 'h-2 w-2' : size === 'md' ? 'h-2.5 w-2.5' : 'h-3 w-3'
            )}
            title={status}
          />
        )}
      </div>
    );
  }
);
Avatar.displayName = 'Avatar';
