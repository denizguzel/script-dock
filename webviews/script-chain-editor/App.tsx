import { Save, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button, Input, WebviewShell } from '../components/ui';
import { ChainPreview } from './components/ChainPreview';
import { ModeToggle } from './components/ModeToggle';
import { RunOrder } from './components/RunOrder';
import { ScriptList } from './components/ScriptList';
import { ValidationHint } from './components/ValidationHint';
import type { ChainEditorState, ExecutionMode, VsCodeApi } from './types';

interface AppProps {
  initialState: ChainEditorState;
  vscode: VsCodeApi;
}

export function App({ initialState, vscode }: AppProps) {
  const [label, setLabel] = useState(initialState.command.label);
  const [mode, setMode] = useState<ExecutionMode>(initialState.command.executionMode);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNames, setSelectedNames] = useState(() => createInitialSelectedNames(initialState));
  const filteredScripts = useMemo(
    () => filterScripts(initialState.scripts, searchQuery),
    [initialState.scripts, searchQuery],
  );
  const scriptByName = useMemo(
    () => new Map(initialState.scripts.map((script) => [script.name, script])),
    [initialState.scripts],
  );
  const validationMessage = getValidationMessage(label, selectedNames);
  const canSave = validationMessage === 'Ready to save';

  const toggleScript = (scriptName: string) => {
    setSelectedNames((current) =>
      current.includes(scriptName) ? current.filter((name) => name !== scriptName) : [...current, scriptName],
    );
  };

  const moveScript = (sourceIndex: number, targetIndex: number) => {
    setSelectedNames((current) => moveItem(current, sourceIndex, targetIndex));
  };

  const dropScript = (sourceIndex: number, insertIndex: number) => {
    setSelectedNames((current) => moveItemToInsertIndex(current, sourceIndex, insertIndex));
  };

  const removeScript = (index: number) => {
    setSelectedNames((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const save = () => {
    if (!canSave) {
      return;
    }

    vscode.postMessage({
      executionMode: mode,
      label,
      scriptNames: selectedNames,
      type: 'save',
    });
  };

  return (
    <WebviewShell
      header={
        <div className="grid gap-3">
          <div className="grid grid-cols-[minmax(14rem,1fr)_auto] items-end gap-3">
            <Input
              label="Label"
              placeholder="verify"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
            <ModeToggle mode={mode} onChange={setMode} />
          </div>
          <ChainPreview scriptNames={selectedNames} />
        </div>
      }
      footer={
        <div className="flex items-center justify-between gap-3">
          <ValidationHint message={validationMessage} />
          <div className="flex justify-end gap-2">
            <Button
              icon={<X aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />}
              variant="secondary"
              onClick={() => vscode.postMessage({ type: 'cancel' })}
            >
              Cancel
            </Button>
            <Button
              disabled={!canSave}
              icon={<Save aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />}
              variant="primary"
              onClick={save}
            >
              Save
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid h-full min-h-0 grid-cols-[minmax(15rem,1fr)_minmax(18rem,1fr)]">
        <ScriptList
          filteredScripts={filteredScripts}
          scripts={initialState.scripts}
          searchQuery={searchQuery}
          selectedNames={selectedNames}
          onSearchQueryChange={setSearchQuery}
          onToggleScript={toggleScript}
        />
        <RunOrder
          scriptByName={scriptByName}
          selectedNames={selectedNames}
          onDropScript={dropScript}
          onMoveScript={moveScript}
          onRemoveScript={removeScript}
        />
      </div>
    </WebviewShell>
  );
}

function createInitialSelectedNames(state: ChainEditorState): string[] {
  const availableNames = new Set(state.scripts.map((script) => script.name));

  return state.command.scriptNames.filter((scriptName) => availableNames.has(scriptName));
}

function moveItem<T>(items: T[], sourceIndex: number, targetIndex: number): T[] {
  if (
    sourceIndex === targetIndex ||
    sourceIndex < 0 ||
    sourceIndex >= items.length ||
    targetIndex < 0 ||
    targetIndex >= items.length
  ) {
    return items;
  }

  const nextItems = [...items];
  const [item] = nextItems.splice(sourceIndex, 1);

  if (item === undefined) {
    return items;
  }

  nextItems.splice(targetIndex, 0, item);

  return nextItems;
}

function moveItemToInsertIndex<T>(items: T[], sourceIndex: number, insertIndex: number): T[] {
  if (sourceIndex < 0 || sourceIndex >= items.length || insertIndex < 0 || insertIndex > items.length) {
    return items;
  }

  const nextItems = [...items];
  const [item] = nextItems.splice(sourceIndex, 1);

  if (item === undefined) {
    return items;
  }

  nextItems.splice(sourceIndex < insertIndex ? insertIndex - 1 : insertIndex, 0, item);

  return nextItems;
}

function filterScripts(scripts: ChainEditorState['scripts'], query: string): ChainEditorState['scripts'] {
  const normalizedQuery = query.trim().toLowerCase();

  if (normalizedQuery === '') {
    return scripts;
  }

  return scripts.filter(
    (script) =>
      script.name.toLowerCase().includes(normalizedQuery) || script.command.toLowerCase().includes(normalizedQuery),
  );
}

function getValidationMessage(label: string, selectedNames: string[]): string {
  if (label.trim() === '') {
    return 'Label is required';
  }

  if (selectedNames.length === 0) {
    return 'Select at least one script';
  }

  return 'Ready to save';
}
