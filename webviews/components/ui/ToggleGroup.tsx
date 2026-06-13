import type { ReactNode } from 'react';
import { cn } from './utils';

interface ToggleGroupProps<Value extends string> {
  ariaLabel: string;
  onChange: (value: Value) => void;
  options: Array<{
    icon?: ReactNode;
    label: string;
    value: Value;
  }>;
  value: Value;
}

export function ToggleGroup<Value extends string>({ ariaLabel, onChange, options, value }: ToggleGroupProps<Value>) {
  return (
    <div
      aria-label={ariaLabel}
      className="inline-flex overflow-hidden rounded border border-[var(--vscode-button-border,var(--vscode-panel-border))]"
      role="group"
    >
      {options.map((option) => {
        const isSelected = option.value === value;

        return (
          <button
            key={option.value}
            aria-pressed={isSelected}
            className={cn(
              'inline-flex h-8 min-w-28 cursor-pointer items-center justify-center gap-2 px-3 text-sm outline-none transition-colors focus-visible:ring-1 focus-visible:ring-[var(--vscode-focusBorder)]',
              isSelected
                ? 'bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)]'
                : 'bg-[var(--vscode-button-secondaryBackground)] text-[var(--vscode-button-secondaryForeground)] hover:bg-[var(--vscode-button-secondaryHoverBackground,var(--vscode-toolbar-hoverBackground))]',
            )}
            type="button"
            onClick={() => onChange(option.value)}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
