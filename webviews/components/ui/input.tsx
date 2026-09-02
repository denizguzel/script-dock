import { Input as InputPrimitive } from '@base-ui/react/input';
import type { ComponentProps } from 'react';

import { cn } from 'cn';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <InputPrimitive
      className={cn(
        'h-8 w-full min-w-0 rounded-md border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20',
        className,
      )}
      data-slot="input"
      {...props}
    />
  );
}
