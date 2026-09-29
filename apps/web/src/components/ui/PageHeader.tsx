import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface PageHeaderProps {
  /** Short machine-ish label. Mono, small, tracked. The only place caps stay. */
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('border-b border-rule pb-5', className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && (
            <span className="block font-mono text-micro uppercase text-ink-faint mb-2">
              {eyebrow}
            </span>
          )}
          <h1 className="text-display font-extrabold text-ink">{title}</h1>
          {description && <p className="mt-2 text-body text-ink-muted max-w-[60ch]">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
