import { ArrowDown, ArrowUp, Cpu, Pencil, PinOff, SquareTerminal, TriangleAlert } from 'lucide-react';
import { IconButton } from '../../components/ui';
import { cn } from '../../components/ui/utils';
import { describeExecutionMode, describeRunState, getRunIcon, getRunTitle, getRunToneClass } from '../run-state';
import type { ExecutionMode, PinnedScriptViewModel, VsCodeApi } from '../types';

interface PinnedScriptRowProps {
  canMoveDown: boolean;
  canMoveUp: boolean;
  isSelected: boolean;
  script: PinnedScriptViewModel;
  vscode: VsCodeApi;
}

export function PinnedScriptRow({ canMoveDown, canMoveUp, isSelected, script, vscode }: PinnedScriptRowProps) {
  const RunIcon = getRunIcon(script.runStatus.state);
  const nextMode: ExecutionMode = script.executionMode === 'background' ? 'terminal' : 'background';
  const ModeIcon = script.executionMode === 'background' ? Cpu : SquareTerminal;
  const runScript = () => {
    vscode.postMessage({ key: script.key, type: 'runPinned' });
  };
  const selectScript = () => {
    vscode.postMessage({ key: script.key, type: 'selectPinned' });
  };
  const editScript = () => {
    vscode.postMessage({ key: script.key, type: 'editPinned' });
  };
  const changeMode = () => {
    vscode.postMessage({ key: script.key, mode: nextMode, type: 'setPinnedMode' });
  };
  const moveUp = () => {
    vscode.postMessage({ key: script.key, type: 'movePinnedUp' });
  };
  const moveDown = () => {
    vscode.postMessage({ key: script.key, type: 'movePinnedDown' });
  };
  const removePinned = () => {
    vscode.postMessage({ key: script.key, type: 'removePinned' });
  };

  return (
    <div
      className={cn(
        'group grid grid-cols-[auto_1fr_auto] items-center gap-2 px-2 py-1 text-[var(--vscode-foreground)] hover:bg-[var(--vscode-list-hoverBackground)]',
        isSelected ? 'bg-[var(--vscode-list-hoverBackground)] ring-1 ring-inset ring-[var(--vscode-focusBorder)]' : '',
      )}
      role="button"
      tabIndex={0}
      title={script.scripts.join(' + ')}
      onClick={selectScript}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          selectScript();
        }
      }}
    >
      <button
        aria-label={getRunTitle(script)}
        className={cn(
          'inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-sm bg-transparent outline-none hover:bg-[var(--vscode-toolbar-hoverBackground,var(--vscode-list-hoverBackground))] focus-visible:ring-1 focus-visible:ring-[var(--vscode-focusBorder)]',
          getRunToneClass(script.runStatus.state),
        )}
        title={getRunTitle(script)}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          runScript();
        }}
      >
        <RunIcon aria-hidden="true" className="h-4 w-4" strokeWidth={1.9} />
      </button>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1">
          <span className="truncate font-medium">{script.label}</span>
          {script.missingScripts.length > 0 ? (
            <TriangleAlert
              aria-label="Missing script"
              className="h-3.5 w-3.5 shrink-0 text-[var(--vscode-editorWarning-foreground,var(--vscode-charts-yellow))]"
              strokeWidth={1.9}
            />
          ) : null}
        </div>
        <div className="truncate text-xs text-[var(--vscode-descriptionForeground)]">
          {describeRunState(script.runStatus.state)} · {describeExecutionMode(script.executionMode)} ·{' '}
          {script.scripts.join(' + ')}
        </div>
      </div>
      <div
        className={cn(
          'flex items-center gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100',
          isSelected ? 'opacity-100' : '',
        )}
      >
        <IconButton
          disabled={!canMoveUp}
          icon={ArrowUp}
          label="Move up"
          onClick={(event) => {
            event.stopPropagation();
            moveUp();
          }}
        />
        <IconButton
          disabled={!canMoveDown}
          icon={ArrowDown}
          label="Move down"
          onClick={(event) => {
            event.stopPropagation();
            moveDown();
          }}
        />
        <IconButton
          icon={ModeIcon}
          label={`Runs in ${script.executionMode}`}
          onClick={(event) => {
            event.stopPropagation();
            changeMode();
          }}
        />
        <IconButton
          icon={Pencil}
          label="Edit pinned script"
          onClick={(event) => {
            event.stopPropagation();
            editScript();
          }}
        />
        <IconButton
          icon={PinOff}
          label="Remove pinned script"
          onClick={(event) => {
            event.stopPropagation();
            removePinned();
          }}
        />
      </div>
    </div>
  );
}
