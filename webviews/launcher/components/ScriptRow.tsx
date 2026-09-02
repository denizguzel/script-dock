import { Cpu, Eye, EyeOff, LogOut, MoreHorizontal, Pin, PinOff, SquareTerminal } from 'lucide-react';
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
import { getRunIcon, getRunTitle, getRunToneClass } from '../run-state';
import type { ScriptViewModel, StatusBarCommandExecutionMode } from '../../../src/types';
import type { VsCodeApi } from '../types';
import { PackageRootBadge } from './PackageRootBadge';

interface ScriptRowProps {
  script: ScriptViewModel;
  vscode: VsCodeApi;
}

export function ScriptRow({ script, vscode }: ScriptRowProps) {
  const nextMode: StatusBarCommandExecutionMode = script.executionMode === 'background' ? 'terminal' : 'background';
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
  return (
    <div className="grid gap-1 px-2 py-1 hover:bg-muted">
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
        <IconButton
          className={cn('size-7', getRunToneClass(script.runStatus.state))}
          icon={RunIcon}
          label={getRunTitle(
            {
              executionMode: script.executionMode ?? 'terminal',
              key: script.id,
              label: script.name,
              missingScripts: [],
              packagePath: script.packagePath,
              runStatus: script.runStatus,
              scripts: [script.name],
            },
            'script',
          )}
          onClick={(event) => {
            event.stopPropagation();
            runScript();
          }}
        />
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 truncate font-medium">{script.name}</span>
            <PackageRootBadge label={script.packageLabel} path={script.packagePath} />
          </div>
          <div className="truncate text-xs text-muted-foreground">{script.command}</div>
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
            <DropdownMenuContent align="end" side="bottom">
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={togglePinned}>
                  {script.isPinned ? <PinOff aria-hidden="true" /> : <Pin aria-hidden="true" />}
                  {script.isPinned ? 'Unpin script' : 'Pin script'}
                </DropdownMenuItem>
                <DropdownMenuItem disabled={!script.isPinned} onClick={changeMode}>
                  <ModeIcon aria-hidden="true" />
                  Run in {nextMode}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleAutoClose}>
                  <LogOut aria-hidden="true" />
                  {script.autoClose ? 'Keep terminal open' : 'Close terminal on success'}
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={hideScript}>
                {script.isHidden ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
                {script.isHidden ? 'Show script' : 'Hide script'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
