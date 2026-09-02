import { useState } from 'react';
import { ChevronDown, ChevronRight, PanelTop } from 'lucide-react';
import {
  Button,
  Checkbox,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui';
import type { ScriptDockState, StatusBarAlignmentPreference, StatusBarDisplayMode } from '../../../src/types';
import type { VsCodeApi } from '../types';

interface StatusBarSettingsProps {
  statusBar: ScriptDockState['statusBar'];
  vscode: VsCodeApi;
}

export function StatusBarSettings({ statusBar, vscode }: StatusBarSettingsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const updateVisibility = (visible: boolean) => {
    vscode.postMessage({ type: 'statusBarVisible', visible });
  };

  const updateDisplayMode = (displayMode: string) => {
    vscode.postMessage({
      displayMode: displayMode as StatusBarDisplayMode,
      type: 'statusBarDisplayMode',
    });
  };

  const updateAlignment = (alignment: string) => {
    vscode.postMessage({
      alignment: alignment as StatusBarAlignmentPreference,
      type: 'statusBarAlignment',
    });
  };
  const toggleExpanded = () => {
    setIsExpanded((currentValue) => !currentValue);
  };
  const DisclosureIcon = isExpanded ? ChevronDown : ChevronRight;
  const summary = statusBar.visible
    ? `${capitalize(statusBar.displayMode)} · ${capitalize(statusBar.alignment)}`
    : 'Hidden';

  return (
    <section className="grid gap-2 border-t border-border px-2 py-2">
      <Button
        aria-controls="status-bar-settings"
        aria-expanded={isExpanded}
        className="min-h-7 w-full justify-between px-2 text-left"
        size="sm"
        variant="ghost"
        type="button"
        onClick={toggleExpanded}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <PanelTop aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.8} />
          <DisclosureIcon aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.8} />
          <span className="truncate font-medium">Status bar</span>
        </span>
        <span className="truncate text-xs text-muted-foreground">{summary}</span>
      </Button>
      {isExpanded ? (
        <div className="grid gap-2" id="status-bar-settings">
          <div className="flex min-h-7 items-center gap-2 text-foreground">
            <Checkbox
              checked={statusBar.visible}
              id="status-bar-visible"
              onCheckedChange={(checked) => updateVisibility(checked)}
            />
            <Label htmlFor="status-bar-visible">Show pinned scripts in status bar</Label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1 text-muted-foreground">
              <Label htmlFor="status-bar-display">Display</Label>
              <Select
                disabled={!statusBar.visible}
                items={[
                  { label: 'Compact', value: 'compact' },
                  { label: 'Expanded', value: 'expanded' },
                ]}
                value={statusBar.displayMode}
                onValueChange={updateDisplayMode}
              >
                <SelectTrigger id="status-bar-display">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">Compact</SelectItem>
                  <SelectItem value="expanded">Expanded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1 text-muted-foreground">
              <Label htmlFor="status-bar-alignment">Side</Label>
              <Select
                disabled={!statusBar.visible}
                items={[
                  { label: 'Left', value: 'left' },
                  { label: 'Right', value: 'right' },
                ]}
                value={statusBar.alignment}
                onValueChange={updateAlignment}
              >
                <SelectTrigger id="status-bar-alignment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function capitalize(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
