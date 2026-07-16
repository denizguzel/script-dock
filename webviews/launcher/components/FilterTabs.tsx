import { cn } from '../../components/ui/utils';
import type { ScriptFilter } from '../types';

interface FilterTabsProps {
  counts: Record<ScriptFilter, number>;
  onChange: (filter: ScriptFilter) => void;
  value: ScriptFilter;
}

const filters: Array<{ label: string; value: ScriptFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Pinned', value: 'pinned' },
  { label: 'Runnable', value: 'runnable' },
  { label: 'Hidden', value: 'hidden' },
];

export function FilterTabs({ counts, onChange, value }: FilterTabsProps) {
  return (
    <div className="flex min-w-0 gap-1 overflow-x-auto border-b border-[var(--vscode-panel-border)] px-2 py-2">
      {filters.map((filter) => {
        const isSelected = filter.value === value;

        return (
          <button
            key={filter.value}
            aria-pressed={isSelected}
            className={cn(
              'inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-sm px-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-[var(--vscode-focusBorder)]',
              isSelected
                ? 'bg-[var(--vscode-list-activeSelectionBackground)] text-[var(--vscode-list-activeSelectionForeground)]'
                : 'bg-transparent text-[var(--vscode-descriptionForeground)] hover:bg-[var(--vscode-toolbar-hoverBackground,var(--vscode-list-hoverBackground))] hover:text-[var(--vscode-foreground)]',
            )}
            type="button"
            onClick={() => onChange(filter.value)}
          >
            <span>{filter.label}</span>
            <span>{counts[filter.value]}</span>
          </button>
        );
      })}
    </div>
  );
}
