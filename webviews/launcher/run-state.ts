import { Check, Play, Square, TriangleAlert } from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';
import type { PinnedScriptViewModel, StatusBarCommandExecutionMode, StatusBarCommandRunState } from '../../src/types';

export function getRunIcon(runState: StatusBarCommandRunState | undefined): ComponentType<SVGProps<SVGSVGElement>> {
  if (runState === 'running') {
    return Square;
  }

  if (runState === 'success') {
    return Check;
  }

  if (runState === 'failed' || runState === 'cancelled') {
    return TriangleAlert;
  }

  return Play;
}

export function getRunTitle(command: PinnedScriptViewModel | undefined, target = 'pinned script'): string {
  if (!command) {
    return `Run ${target}`;
  }

  if (command.runStatus.state === 'running') {
    return command.executionMode === 'terminal' ? 'Stop terminal run' : 'Cancel background run';
  }

  if (command.runStatus.state === 'failed') {
    return 'Run again';
  }

  return `Run ${target}`;
}

export function describeExecutionMode(mode: StatusBarCommandExecutionMode): string {
  return mode === 'background' ? 'Background' : 'Terminal';
}

export function describeRunState(runState: StatusBarCommandRunState): string {
  if (runState === 'success') {
    return 'Ok';
  }

  if (runState === 'failed') {
    return 'Failed';
  }

  if (runState === 'running') {
    return 'Running';
  }

  if (runState === 'cancelled') {
    return 'Stopped';
  }

  return 'Ready';
}

export function getRunToneClass(runState: StatusBarCommandRunState | undefined): string {
  if (runState === 'running') {
    return 'text-[var(--vscode-testing-iconFailed)]';
  }

  if (runState === 'failed' || runState === 'cancelled') {
    return 'text-[var(--vscode-editorWarning-foreground,var(--vscode-charts-yellow))]';
  }

  return 'text-[var(--vscode-testing-iconPassed)]';
}
