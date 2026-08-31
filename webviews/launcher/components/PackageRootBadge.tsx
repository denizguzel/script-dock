import { Package } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui';
import { cn } from '../../components/ui/utils';

interface PackageRootBadgeProps {
  label: string;
  path: string;
}

export function PackageRootBadge({ label, path }: PackageRootBadgeProps) {
  const isWorkspaceRoot = path === 'Workspace root';
  const tooltipLabel = isWorkspaceRoot ? 'Workspace root' : label;

  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={tooltipLabel}
        render={
          <span
            className={cn(
              'inline-flex min-w-0 items-center gap-1 text-xs text-muted-foreground',
              isWorkspaceRoot ? 'size-4 justify-center' : 'max-w-[48%] shrink',
            )}
          />
        }
      >
        <Package aria-hidden="true" className="size-3 shrink-0" strokeWidth={1.8} />
        {isWorkspaceRoot ? null : <span className="truncate">{label}</span>}
      </TooltipTrigger>
      <TooltipContent>{tooltipLabel}</TooltipContent>
    </Tooltip>
  );
}
