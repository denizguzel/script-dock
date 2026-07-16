import { Cpu, Eye, EyeOff, LogOut, MoreHorizontal, Pin, PinOff, SquareTerminal } from 'lucide-react';
import { IconButton } from '../../components/ui';
import { cn } from '../../components/ui/utils';
import { getRunIcon, getRunTitle, getRunToneClass } from '../run-state';
import type { ExecutionMode, ScriptViewModel, VsCodeApi } from '../types';

interface ScriptRowProps {
  isSelected: boolean;
  onSelect: (script: ScriptViewModel) => void;
  script: ScriptViewModel;
  vscode: VsCodeApi;
}

export function ScriptRow({ isSelected, onSelect, script, vscode }: ScriptRowProps) {
  const nextMode: ExecutionMode = script.executionMode === 'background' ? 'terminal' : 'background';
  const ModeIcon = script.executionMode === 'background' ? Cpu : SquareTerminal;
  const RunIcon = getRunIcon(script.runStatus.state);
  const runScript = () => {
    vscode.postMessage({ scriptId: script.id, type: 'runScript' });
  };
  const togglePinned = () => {
    vscode.postMessage({ enabled: !script.isPinned, scriptId: script.id, type: 'setPinned' });
  };
  const toggleAutoClose = () => {
    vscode.postMessage({ enabled: !script.autoClose, scriptId: script.id, type: 'setAutoClose' });
  };
  const changeMode = () => {
    vscode.postMessage({ mode: nextMode, scriptId: script.id, type: 'setScriptMode' });
  };
  const hideScript = () => {
    vscode.postMessage({ enabled: !script.isHidden, scriptId: script.id, type: 'setHidden' });
  };
  const selectScript = () => {
    onSelect(script);
  };

  return (
    <div
      className={cn(
        'grid gap-1 px-2 py-1 hover:bg-[var(--vscode-list-hoverBackground)]',
        isSelected ? 'bg-[var(--vscode-list-activeSelectionBackground)]' : '',
      )}
      role="button"
      tabIndex={0}
      onClick={selectScript}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          selectScript();
        }
      }}
    >
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
        <button
          aria-label={getRunTitle({
            executionMode: script.executionMode ?? 'terminal',
            key: script.id,
            label: script.name,
            missingScripts: [],
            packagePath: script.packagePath,
            runStatus: script.runStatus,
            scripts: [script.name],
          })}
          className={cn(
            'inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-sm bg-transparent outline-none hover:bg-[var(--vscode-toolbar-hoverBackground,var(--vscode-list-hoverBackground))] focus-visible:ring-1 focus-visible:ring-[var(--vscode-focusBorder)]',
            getRunToneClass(script.runStatus.state),
          )}
          title={script.runStatus.state === 'running' ? `Stop ${script.name}` : `Run ${script.name}`}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            runScript();
          }}
        >
          <RunIcon aria-hidden="true" className="h-4 w-4" strokeWidth={1.9} />
        </button>
        <div className="min-w-0">
          <div className="truncate font-medium">{script.name}</div>
          <div className="truncate text-xs text-[var(--vscode-descriptionForeground)]">{script.command}</div>
        </div>
        <div className="flex items-center gap-0.5">
          <IconButton
            className={cn(script.isPinned ? 'text-[var(--vscode-testing-iconPassed)]' : '')}
            icon={script.isPinned ? PinOff : Pin}
            label={script.isPinned ? 'Unpin script' : 'Pin script'}
            onClick={(event) => {
              event.stopPropagation();
              togglePinned();
            }}
          />
          <IconButton
            icon={MoreHorizontal}
            label={isSelected ? 'Hide script options' : 'Show script options'}
            onClick={(event) => {
              event.stopPropagation();
              selectScript();
            }}
          />
        </div>
      </div>
      {isSelected ? (
        <div className="ml-8 flex min-w-0 flex-wrap items-center gap-0.5">
          <IconButton
            disabled={!script.isPinned}
            icon={ModeIcon}
            label={script.executionMode === 'background' ? 'Runs in background' : 'Runs in terminal'}
            onClick={changeMode}
          />
          <IconButton
            className={cn(script.autoClose ? 'text-[var(--vscode-testing-iconPassed)]' : '')}
            icon={LogOut}
            label={script.autoClose ? 'Keep terminal open' : 'Close terminal on success'}
            onClick={toggleAutoClose}
          />
          <IconButton
            icon={script.isHidden ? Eye : EyeOff}
            label={script.isHidden ? 'Show script' : 'Hide script'}
            onClick={hideScript}
          />
        </div>
      ) : null}
    </div>
  );
}
