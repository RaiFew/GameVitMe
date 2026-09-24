import { cn } from '../../lib/utils';

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite] text-zinc-900 dark:text-zinc-100",
        className
      )}
      role="status"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
