import type { InputHTMLAttributes } from 'react';
import { cn } from './utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Input({ className, label, ...props }: InputProps) {
  return (
    <label className="grid gap-1.5">
      <span>{label}</span>
      <input
        className={cn(
          'h-8 border border-[var(--vscode-input-border,transparent)] bg-[var(--vscode-input-background)] px-2 text-[var(--vscode-input-foreground)] outline-none focus:border-[var(--vscode-focusBorder)]',
          className,
        )}
        {...props}
      />
    </label>
  );
}
