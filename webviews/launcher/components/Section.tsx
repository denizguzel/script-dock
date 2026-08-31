import type { ComponentType, ReactNode, SVGProps } from 'react';

interface SectionProps {
  actions?: ReactNode;
  children: ReactNode;
  count: number;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
}

export function Section({ actions, children, count, icon: Icon, title }: SectionProps) {
  return (
    <section className="grid gap-1 border-b border-border py-2 last:border-b-0">
      <header className="flex items-center justify-between gap-3 px-2">
        <strong className="flex min-w-0 items-center gap-1.5 uppercase tracking-normal text-foreground">
          {Icon ? (
            <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.8} />
          ) : null}
          <span className="truncate">{title}</span>
        </strong>
        <div className="flex items-center gap-1">
          {actions}
          <span className="min-w-4 text-right text-xs text-muted-foreground">{count}</span>
        </div>
      </header>
      <div className="grid gap-0.5">{children}</div>
    </section>
  );
}
