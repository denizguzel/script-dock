import type { ChangeEvent } from 'react';
import { Download, Eye, Lightbulb, Pencil, Plus, RefreshCw, RotateCcw, Upload } from 'lucide-react';
import { IconButton } from '../../components/ui';
import { cn } from '../../components/ui/utils';
import { getRunIcon, getRunTitle, getRunToneClass } from '../run-state';
import type { PinnedScriptViewModel, VsCodeApi } from '../types';

interface TopRunnerProps {
  hiddenScriptCount: number;
  pinnedScripts: PinnedScriptViewModel[];
  selectedScript: PinnedScriptViewModel | undefined;
  vscode: VsCodeApi;
}

export function TopRunner({ hiddenScriptCount, pinnedScripts, selectedScript, vscode }: TopRunnerProps) {
  const RunIcon = getRunIcon(selectedScript?.runStatus.state);
  const selectPinnedScript = (event: ChangeEvent<HTMLSelectElement>) => {
    vscode.postMessage({ key: event.target.value, type: 'selectPinned' });
  };
  const runPinnedScript = () => {
    vscode.postMessage({ key: selectedScript?.key, type: 'runPinned' });
  };
  const editPinnedScript = () => {
    vscode.postMessage({ key: selectedScript?.key, type: 'editPinned' });
  };
  const createChain = () => {
    vscode.postMessage({ type: 'createChain' });
  };
  const refreshScripts = () => {
    vscode.postMessage({ type: 'refresh' });
  };
  const addSuggestedChains = () => {
    vscode.postMessage({ type: 'addSuggestedChains' });
  };
  const showHiddenScript = () => {
    vscode.postMessage({ type: 'showHiddenScript' });
  };
  const resetPreferences = () => {
    vscode.postMessage({ type: 'resetPreferences' });
  };
  const exportProfile = () => {
    vscode.postMessage({ type: 'exportProfile' });
  };
  const importProfile = () => {
    vscode.postMessage({ type: 'importProfile' });
  };

  return (
    <section className="grid gap-2 border-b border-[var(--vscode-panel-border)] p-2">
      <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-1">
        <label className="sr-only" htmlFor="script-dock-pinned-select">
          Pinned script
        </label>
        <select
          id="script-dock-pinned-select"
          className="h-8 min-w-0 rounded-sm border border-[var(--vscode-dropdown-border,var(--vscode-input-border,transparent))] bg-[var(--vscode-dropdown-background,var(--vscode-input-background))] px-2 text-[var(--vscode-dropdown-foreground,var(--vscode-input-foreground))] outline-none disabled:cursor-not-allowed disabled:opacity-45 focus:border-[var(--vscode-focusBorder)]"
          disabled={pinnedScripts.length === 0}
          value={selectedScript?.key ?? ''}
          onChange={selectPinnedScript}
        >
          {pinnedScripts.length === 0 ? <option value="">No pinned scripts</option> : null}
          {pinnedScripts.map((script) => (
            <option key={script.key} value={script.key}>
              {script.label}
            </option>
          ))}
        </select>
        <button
          aria-label={getRunTitle(selectedScript)}
          className={cn(
            'inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-sm bg-transparent outline-none hover:bg-[var(--vscode-toolbar-hoverBackground,var(--vscode-list-hoverBackground))] focus-visible:ring-1 focus-visible:ring-[var(--vscode-focusBorder)] disabled:cursor-not-allowed disabled:opacity-35',
            getRunToneClass(selectedScript?.runStatus.state),
          )}
          disabled={!selectedScript}
          title={getRunTitle(selectedScript)}
          type="button"
          onClick={runPinnedScript}
        >
          <RunIcon aria-hidden="true" className="h-4 w-4" strokeWidth={1.9} />
        </button>
        <IconButton disabled={!selectedScript} icon={Pencil} label="Edit pinned script" onClick={editPinnedScript} />
        <IconButton icon={Plus} label="Create script chain" onClick={createChain} />
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-1">
        <IconButton icon={RefreshCw} label="Refresh scripts" onClick={refreshScripts} />
        <IconButton icon={Lightbulb} label="Add suggested chains" onClick={addSuggestedChains} />
        <span className="mx-1 h-5 w-px bg-[var(--vscode-panel-border)]" />
        <IconButton icon={Download} label="Export workspace profile" onClick={exportProfile} />
        <IconButton icon={Upload} label="Import workspace profile" onClick={importProfile} />
        <span className="mx-1 h-5 w-px bg-[var(--vscode-panel-border)]" />
        <IconButton
          disabled={hiddenScriptCount === 0}
          icon={Eye}
          label={hiddenScriptCount === 0 ? 'No hidden scripts' : 'Show hidden script'}
          onClick={showHiddenScript}
        />
        <IconButton icon={RotateCcw} label="Reset workspace preferences" onClick={resetPreferences} />
      </div>
    </section>
  );
}
