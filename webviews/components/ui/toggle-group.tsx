import { Toggle as TogglePrimitive } from '@base-ui/react/toggle';
import { ToggleGroup as ToggleGroupPrimitive } from '@base-ui/react/toggle-group';
import { cva } from 'class-variance-authority';
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

const toggleItemVariants = cva(
  'inline-flex h-full min-w-28 cursor-pointer items-center justify-center gap-2 rounded-md px-3 text-sm font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      active: {
        false: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        true: 'bg-primary text-primary-foreground hover:bg-primary/80',
      },
    },
  },
);

export function ToggleGroup<Value extends string>({ ariaLabel, onChange, options, value }: ToggleGroupProps<Value>) {
  return (
    <ToggleGroupPrimitive
      aria-label={ariaLabel}
      className="inline-flex h-8 items-center gap-0.5 rounded-md border border-border bg-secondary"
      value={[value]}
      onValueChange={(nextValue) => {
        const [next] = nextValue;

        if (next) {
          onChange(next);
        }
      }}
    >
      {options.map((option) => (
        <TogglePrimitive
          key={option.value}
          className={cn(toggleItemVariants({ active: option.value === value }))}
          value={option.value}
        >
          {option.icon}
          {option.label}
        </TogglePrimitive>
      ))}
    </ToggleGroupPrimitive>
  );
}
