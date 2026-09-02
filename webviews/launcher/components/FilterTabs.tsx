import { Button } from '../../components/ui';
import type { ScriptFilter } from '../../../src/types';

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
    <div className="flex min-w-0 gap-1 overflow-x-auto border-b border-border px-2 py-2">
      {filters.map((filter) => {
        const isSelected = filter.value === value;

        return (
          <Button
            key={filter.value}
            aria-pressed={isSelected}
            className="shrink-0 gap-1 px-2 text-xs"
            size="sm"
            variant={isSelected ? 'default' : 'ghost'}
            type="button"
            onClick={() => onChange(filter.value)}
          >
            <span>{filter.label}</span>
            <span>{counts[filter.value]}</span>
          </Button>
        );
      })}
    </div>
  );
}
