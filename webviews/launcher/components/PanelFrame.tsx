import type { ReactNode } from 'react';

interface PanelFrameProps {
  children: ReactNode;
}

export function PanelFrame({ children }: PanelFrameProps) {
  return (
    <main className="flex min-h-screen flex-col bg-[var(--vscode-sideBar-background,var(--vscode-editor-background))] text-[var(--vscode-foreground)]">
      {children}
    </main>
  );
}
