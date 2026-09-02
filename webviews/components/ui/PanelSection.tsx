import type { ComponentType, ReactNode, SVGProps } from 'react';
import { cn } from 'cn';

interface PanelSectionProps {
  children: ReactNode;
  className?: string;
  count?: ReactNode;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
}

export function PanelSection({ children, className, count, icon: Icon, title }: PanelSectionProps) {
  return (
    <section className={cn('grid min-h-0 min-w-0 grid-rows-[auto_1fr]', className)}>
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <strong className="flex min-w-0 items-center gap-1.5">
          {Icon ? (
            <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.8} />
          ) : null}
          <span className="truncate">{title}</span>
        </strong>
        {count !== undefined ? <span className="text-muted-foreground">{count}</span> : null}
      </header>
      <div className="min-h-0 overflow-auto p-2">{children}</div>
    </section>
  );
}
