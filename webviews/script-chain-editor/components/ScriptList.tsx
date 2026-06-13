import { Minus, Plus } from 'lucide-react';
import { Input, PanelSection } from '../../components/ui';
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
    <PanelSection count={`${filteredScripts.length} / ${scripts.length}`} title="Package Scripts">
      <div className="mb-2">
        <Input
          label="Search"
          placeholder="Filter by script or command"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
        />
      </div>
      {filteredScripts.length === 0 ? (
        <div className="p-4 text-[var(--vscode-descriptionForeground)]">No scripts match this filter.</div>
      ) : null}
      {filteredScripts.map((script) => {
        const isSelected = selected.has(script.name);
        const Icon = isSelected ? Minus : Plus;

        return (
          <button
            key={script.name}
            className={[
              'mb-1 grid min-h-10 w-full cursor-pointer grid-cols-[1.5rem_1fr] items-center gap-2 border border-transparent px-2 py-1 text-left outline-none transition-colors focus-visible:ring-1 focus-visible:ring-[var(--vscode-focusBorder)]',
              isSelected
                ? 'bg-[var(--vscode-list-activeSelectionBackground)] text-[var(--vscode-list-activeSelectionForeground)]'
                : 'bg-transparent text-[var(--vscode-foreground)] hover:bg-[var(--vscode-list-hoverBackground)]',
            ].join(' ')}
            type="button"
            onClick={() => onToggleScript(script.name)}
          >
            <Icon aria-hidden="true" className="h-4 w-4 justify-self-center" strokeWidth={1.8} />
            <span className="min-w-0">
              <span className="block overflow-hidden text-ellipsis whitespace-nowrap">{script.name}</span>
              <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-[var(--vscode-descriptionForeground)]">
                {script.command}
              </span>
            </span>
          </button>
        );
      })}
    </PanelSection>
  );
}
