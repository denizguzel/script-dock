import { Download, Eye, Lightbulb, MoreHorizontal, Pencil, Plus, RefreshCw, RotateCcw, Upload } from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../../components/ui';
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
  const selectPinnedScript = (key: string) => {
    if (key) {
      vscode.postMessage({ key, type: 'selectPinned' });
    }
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
    <section className="grid gap-2 border-b border-border p-2">
      <div className="grid grid-cols-[minmax(0,1fr)_repeat(4,auto)] items-center gap-1">
        <Select
          disabled={pinnedScripts.length === 0}
          items={pinnedScripts.map((script) => ({ label: script.label, value: script.key }))}
          value={selectedScript?.key ?? ''}
          onValueChange={selectPinnedScript}
        >
          <SelectTrigger aria-label="Pinned script" className="min-w-0">
            <SelectValue placeholder="No pinned scripts" />
          </SelectTrigger>
          <SelectContent>
            {pinnedScripts.map((script) => (
              <SelectItem key={script.key} value={script.key}>
                {script.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <IconButton
          className={cn(getRunToneClass(selectedScript?.runStatus.state))}
          disabled={!selectedScript}
          icon={RunIcon}
          label={getRunTitle(selectedScript)}
          onClick={runPinnedScript}
        />
        <IconButton disabled={!selectedScript} icon={Pencil} label="Edit pinned script" onClick={editPinnedScript} />
        <IconButton icon={Plus} label="Create script chain" onClick={createChain} />
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger
              render={
                <DropdownMenuTrigger
                  render={
                    <Button aria-label="More Script Dock actions" size="icon-sm" variant="ghost">
                      <MoreHorizontal aria-hidden="true" className="size-4" strokeWidth={1.8} />
                    </Button>
                  }
                />
              }
            />
            <TooltipContent>More Script Dock actions</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" side="bottom">
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={refreshScripts}>
                <RefreshCw aria-hidden="true" />
                Refresh scripts
              </DropdownMenuItem>
              <DropdownMenuItem onClick={addSuggestedChains}>
                <Lightbulb aria-hidden="true" />
                Suggest chains
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={exportProfile}>
                <Download aria-hidden="true" />
                Export workspace profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={importProfile}>
                <Upload aria-hidden="true" />
                Import workspace profile
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem disabled={hiddenScriptCount === 0} onClick={showHiddenScript}>
                <Eye aria-hidden="true" />
                {hiddenScriptCount === 0 ? 'No hidden scripts' : 'Show hidden scripts'}
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={resetPreferences}>
                <RotateCcw aria-hidden="true" />
                Reset preferences
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </section>
  );
}
