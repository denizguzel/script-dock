import type { ButtonHTMLAttributes, ComponentType, SVGProps } from 'react';

import { Button } from './button';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
}

export function IconButton({ icon: Icon, label, ...props }: IconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button aria-label={label} size="icon-sm" variant="ghost" {...props} />}>
        <Icon aria-hidden="true" className="size-4" strokeWidth={1.8} />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
