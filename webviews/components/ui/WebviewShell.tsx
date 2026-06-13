import type { ReactNode } from 'react';

interface WebviewShellProps {
  children: ReactNode;
  footer: ReactNode;
  header: ReactNode;
}

export function WebviewShell({ children, footer, header }: WebviewShellProps) {
  return (
    <div className="grid min-h-screen grid-rows-[auto_1fr_auto] bg-[var(--vscode-editor-background)] text-[var(--vscode-foreground)]">
      <header className="border-b border-[var(--vscode-panel-border)] px-5 py-4">{header}</header>
      <main className="min-h-0">{children}</main>
      <footer className="border-t border-[var(--vscode-panel-border)] px-5 py-4">{footer}</footer>
    </div>
  );
}
