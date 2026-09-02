import { ArrowDown, ArrowUp, Cpu, MoreHorizontal, Pencil, PinOff, SquareTerminal, TriangleAlert } from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../../components/ui';
import { cn } from 'cn';
import { describeExecutionMode, describeRunState, getRunIcon, getRunTitle, getRunToneClass } from '../run-state';
import type { PinnedScriptViewModel, StatusBarCommandExecutionMode } from '../../../src/types';
import type { VsCodeApi } from '../types';
import { PackageRootBadge } from './PackageRootBadge';

interface PinnedScriptRowProps {
  canMoveDown: boolean;
  canMoveUp: boolean;
  isSelected: boolean;
  script: PinnedScriptViewModel;
  vscode: VsCodeApi;
}

export function PinnedScriptRow({ canMoveDown, canMoveUp, isSelected, script, vscode }: PinnedScriptRowProps) {
  const RunIcon = getRunIcon(script.runStatus.state);
  const nextMode: StatusBarCommandExecutionMode = script.executionMode === 'background' ? 'terminal' : 'background';
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
        'group relative grid grid-cols-[auto_1fr_auto] items-center gap-2 px-2 py-1 text-foreground hover:bg-muted',
        isSelected ? 'bg-muted ring-1 ring-inset ring-ring' : '',
      )}
      role="button"
      tabIndex={0}
      aria-label={`${script.label}: ${script.scripts.join(' + ')}`}
      onClick={selectScript}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          selectScript();
        }
      }}
    >
      <IconButton
        className={cn('size-7', getRunToneClass(script.runStatus.state))}
        icon={RunIcon}
        label={getRunTitle(script)}
        onClick={(event) => {
          event.stopPropagation();
          runScript();
        }}
      />
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1">
          <span className="truncate font-medium">{script.label}</span>
          {script.missingScripts.length > 0 ? (
            <TriangleAlert aria-label="Missing script" className="size-3.5 shrink-0 text-warning" strokeWidth={1.9} />
          ) : null}
        </div>
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <span className="min-w-0 truncate">
            {describeRunState(script.runStatus.state)} · {describeExecutionMode(script.executionMode)} ·{' '}
            {script.scripts.join(' + ')}
          </span>
          <PackageRootBadge label={script.packagePath} path={script.packagePath} />
        </div>
      </div>
      <div className="flex items-center gap-0.5">
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger
              render={
                <DropdownMenuTrigger
                  render={
                    <Button aria-label="Script actions" size="icon-sm" variant="ghost">
                      <MoreHorizontal aria-hidden="true" className="size-4" strokeWidth={1.8} />
                    </Button>
                  }
                />
              }
            />
            <TooltipContent>Script actions</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" side={canMoveDown ? 'bottom' : 'top'}>
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={editScript}>
                <Pencil aria-hidden="true" />
                Edit pinned script
              </DropdownMenuItem>
              <DropdownMenuItem onClick={changeMode}>
                <ModeIcon aria-hidden="true" />
                Run in {nextMode}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem disabled={!canMoveUp} onClick={moveUp}>
                <ArrowUp aria-hidden="true" />
                Move up
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!canMoveDown} onClick={moveDown}>
                <ArrowDown aria-hidden="true" />
                Move down
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={removePinned}>
              <PinOff aria-hidden="true" />
              Remove pinned script
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
