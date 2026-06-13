import type { ReactNode } from 'react';
import { cn } from './utils';

interface PanelSectionProps {
  children: ReactNode;
  className?: string;
  count?: ReactNode;
  title: string;
}

export function PanelSection({ children, className, count, title }: PanelSectionProps) {
  return (
    <section className={cn('grid min-h-0 min-w-0 grid-rows-[auto_1fr]', className)}>
      <header className="flex items-center justify-between gap-3 border-b border-[var(--vscode-panel-border)] px-4 py-3">
        <strong>{title}</strong>
        {count !== undefined ? <span className="text-[var(--vscode-descriptionForeground)]">{count}</span> : null}
      </header>
      <div className="min-h-0 overflow-auto p-2">{children}</div>
    </section>
  );
}
