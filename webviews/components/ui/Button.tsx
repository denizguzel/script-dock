import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  variant?: ButtonVariant;
}

const baseClass =
  'inline-flex h-8 min-w-24 cursor-pointer items-center justify-center gap-2 px-3 text-sm outline-none transition-colors focus-visible:ring-1 focus-visible:ring-[var(--vscode-focusBorder)] disabled:cursor-not-allowed disabled:opacity-45';

const variantClass: Record<ButtonVariant, string> = {
  ghost:
    'min-w-0 bg-transparent text-[var(--vscode-foreground)] hover:bg-[var(--vscode-toolbar-hoverBackground,var(--vscode-list-hoverBackground))]',
  primary:
    'bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] hover:bg-[var(--vscode-button-hoverBackground)]',
  secondary:
    'bg-[var(--vscode-button-secondaryBackground)] text-[var(--vscode-button-secondaryForeground)] hover:bg-[var(--vscode-button-secondaryHoverBackground,var(--vscode-toolbar-hoverBackground))]',
};

export function Button({ children, className, icon, type = 'button', variant = 'secondary', ...props }: ButtonProps) {
  return (
    <button className={cn(baseClass, variantClass[variant], className)} type={type} {...props}>
      {icon}
      {children}
    </button>
  );
}
