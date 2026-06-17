import type { ReactNode } from 'react';

interface SectionProps {
  actions?: ReactNode;
  children: ReactNode;
  count: number;
  title: string;
}

export function Section({ actions, children, count, title }: SectionProps) {
  return (
    <section className="grid gap-1 border-b border-[var(--vscode-panel-border)] py-2 last:border-b-0">
      <header className="flex items-center justify-between gap-3 px-2">
        <strong className="uppercase tracking-normal text-[var(--vscode-sideBarSectionHeader-foreground,var(--vscode-foreground))]">
          {title}
        </strong>
        <div className="flex items-center gap-1">
          {actions}
          <span className="min-w-4 text-right text-xs text-[var(--vscode-descriptionForeground)]">{count}</span>
        </div>
      </header>
      <div className="grid gap-0.5">{children}</div>
    </section>
  );
}
