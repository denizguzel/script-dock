import type { ButtonHTMLAttributes, ComponentType, SVGProps } from 'react';
import { cn } from './utils';

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
}

export function IconButton({ className, icon: Icon, label, type = 'button', ...props }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={cn(
        'inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm border border-transparent bg-transparent text-[var(--vscode-icon-foreground,var(--vscode-foreground))] outline-none transition-colors hover:border-[var(--vscode-button-border,var(--vscode-panel-border))] hover:bg-[var(--vscode-toolbar-hoverBackground,var(--vscode-list-hoverBackground))] hover:text-[var(--vscode-foreground)] active:bg-[var(--vscode-list-activeSelectionBackground)] focus-visible:ring-1 focus-visible:ring-[var(--vscode-focusBorder)] disabled:cursor-not-allowed disabled:opacity-35',
        className,
      )}
      title={label}
      type={type}
      {...props}
    >
      <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />
    </button>
  );
}
