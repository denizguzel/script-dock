import { Check, Play, Square, TriangleAlert } from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';
import type { ExecutionMode, PinnedScriptViewModel, RunState } from './types';

export function getRunIcon(runState: RunState | undefined): ComponentType<SVGProps<SVGSVGElement>> {
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

export function getRunTitle(command: PinnedScriptViewModel | undefined): string {
  if (!command) {
    return 'Run pinned script';
  }

  if (command.runStatus.state === 'running') {
    return command.executionMode === 'terminal' ? 'Stop terminal run' : 'Cancel background run';
  }

  if (command.runStatus.state === 'failed') {
    return 'Run again';
  }

  return 'Run pinned script';
}

export function describeExecutionMode(mode: ExecutionMode): string {
  return mode === 'background' ? 'Background' : 'Terminal';
}

export function describeRunState(runState: RunState): string {
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

export function getRunToneClass(runState: RunState | undefined): string {
  if (runState === 'running') {
    return 'text-[var(--vscode-testing-iconFailed)]';
  }

  if (runState === 'failed' || runState === 'cancelled') {
    return 'text-[var(--vscode-editorWarning-foreground,var(--vscode-charts-yellow))]';
  }

  return 'text-[var(--vscode-testing-iconPassed)]';
}
