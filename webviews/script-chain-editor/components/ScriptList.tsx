import { ListChecks, Minus, Plus } from 'lucide-react';
import { Button, Input, Label, PanelSection } from '../../components/ui';
import { cn } from 'cn';
import type { ScriptOption } from '../types';

interface ScriptListProps {
  filteredScripts: ScriptOption[];
  onSearchQueryChange: (query: string) => void;
  scripts: ScriptOption[];
  searchQuery: string;
  selectedNames: string[];
  onToggleScript: (scriptName: string) => void;
}

export function ScriptList({
  filteredScripts,
  onSearchQueryChange,
  scripts,
  searchQuery,
  selectedNames,
  onToggleScript,
}: ScriptListProps) {
  const selected = new Set(selectedNames);

  return (
    <PanelSection count={`${filteredScripts.length} / ${scripts.length}`} icon={ListChecks} title="Package Scripts">
      <div className="mb-2">
        <label className="grid gap-1.5">
          <Label htmlFor="script-search">Search</Label>
          <Input
            id="script-search"
            placeholder="Filter by script or command"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
          />
        </label>
      </div>
      {filteredScripts.length === 0 ? (
        <div className="p-4 text-muted-foreground">No scripts match this filter.</div>
      ) : null}
      {filteredScripts.map((script) => {
        const isSelected = selected.has(script.name);
        const Icon = isSelected ? Minus : Plus;

        return (
          <Button
            key={script.name}
            className={cn(
              'mb-1 min-h-10 w-full justify-start gap-2 rounded-none border border-transparent px-2 py-1 text-left',
              isSelected ? 'border-l-2 border-l-ring bg-muted text-foreground' : '',
            )}
            variant="ghost"
            type="button"
            onClick={() => onToggleScript(script.name)}
          >
            <Icon aria-hidden="true" className="h-4 w-4 justify-self-center" strokeWidth={1.8} />
            <span className="min-w-0">
              <span className="block overflow-hidden text-ellipsis whitespace-nowrap">{script.name}</span>
              <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-muted-foreground">
                {script.command}
              </span>
            </span>
          </Button>
        );
      })}
    </PanelSection>
  );
}
