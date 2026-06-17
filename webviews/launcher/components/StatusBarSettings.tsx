import type { ChangeEvent } from 'react';
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { LauncherState, StatusBarAlignment, StatusBarDisplayMode, VsCodeApi } from '../types';

interface StatusBarSettingsProps {
  statusBar: LauncherState['statusBar'];
  vscode: VsCodeApi;
}

export function StatusBarSettings({ statusBar, vscode }: StatusBarSettingsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const updateVisibility = (event: ChangeEvent<HTMLInputElement>) => {
    vscode.postMessage({ type: 'statusBarVisible', visible: event.target.checked });
  };

  const updateDisplayMode = (event: ChangeEvent<HTMLSelectElement>) => {
    vscode.postMessage({
      displayMode: event.target.value as StatusBarDisplayMode,
      type: 'statusBarDisplayMode',
    });
  };

  const updateAlignment = (event: ChangeEvent<HTMLSelectElement>) => {
    vscode.postMessage({
      alignment: event.target.value as StatusBarAlignment,
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
    <section className="grid gap-2 border-t border-[var(--vscode-panel-border)] px-2 py-2">
      <button
        className="flex min-h-7 cursor-pointer items-center justify-between gap-2 rounded-sm bg-transparent text-left text-[var(--vscode-foreground)] outline-none hover:bg-[var(--vscode-list-hoverBackground)] focus-visible:ring-1 focus-visible:ring-[var(--vscode-focusBorder)]"
        type="button"
        onClick={toggleExpanded}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <DisclosureIcon aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.8} />
          <span className="truncate font-medium">Status bar</span>
        </span>
        <span className="truncate text-xs text-[var(--vscode-descriptionForeground)]">{summary}</span>
      </button>
      {isExpanded ? (
        <>
          <label className="flex min-h-7 cursor-pointer items-center gap-2 text-[var(--vscode-foreground)]">
            <input
              checked={statusBar.visible}
              className="m-0 h-4 w-4 accent-[var(--vscode-button-background)]"
              type="checkbox"
              onChange={updateVisibility}
            />
            <span>Show pinned scripts in status bar</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1 text-[var(--vscode-descriptionForeground)]">
              <span>Display</span>
              <select
                className="h-8 min-w-0 rounded-sm border border-[var(--vscode-dropdown-border,var(--vscode-input-border,transparent))] bg-[var(--vscode-dropdown-background,var(--vscode-input-background))] px-2 text-[var(--vscode-dropdown-foreground,var(--vscode-input-foreground))] outline-none disabled:cursor-not-allowed disabled:opacity-45 focus:border-[var(--vscode-focusBorder)]"
                disabled={!statusBar.visible}
                value={statusBar.displayMode}
                onChange={updateDisplayMode}
              >
                <option value="compact">Compact</option>
                <option value="expanded">Expanded</option>
              </select>
            </label>
            <label className="grid gap-1 text-[var(--vscode-descriptionForeground)]">
              <span>Side</span>
              <select
                className="h-8 min-w-0 rounded-sm border border-[var(--vscode-dropdown-border,var(--vscode-input-border,transparent))] bg-[var(--vscode-dropdown-background,var(--vscode-input-background))] px-2 text-[var(--vscode-dropdown-foreground,var(--vscode-input-foreground))] outline-none disabled:cursor-not-allowed disabled:opacity-45 focus:border-[var(--vscode-focusBorder)]"
                disabled={!statusBar.visible}
                value={statusBar.alignment}
                onChange={updateAlignment}
              >
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
            </label>
          </div>
        </>
      ) : null}
    </section>
  );
}

function capitalize(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
