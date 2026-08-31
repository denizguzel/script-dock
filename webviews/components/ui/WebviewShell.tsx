import type { ReactNode } from 'react';
import { cn } from './utils';

interface WebviewShellProps {
  children: ReactNode;
  footer?: ReactNode;
  header: ReactNode;
}

export function WebviewShell({ children, footer, header }: WebviewShellProps) {
  return (
    <div
      className={cn(
        'grid min-h-screen bg-background text-foreground',
        footer ? 'grid-rows-[auto_1fr_auto]' : 'grid-rows-[auto_1fr]',
      )}
    >
      <header className="border-b border-border px-5 py-4">{header}</header>
      <main className="min-h-0">{children}</main>
      {footer ? <footer className="border-t border-border px-5 py-4">{footer}</footer> : null}
    </div>
  );
}
