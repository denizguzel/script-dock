import type { StatusBarCommand, StatusBarCommandExecutionMode, StatusBarCommandFailurePolicy } from './types';

export function createStatusBarCommandKey(command: StatusBarCommand): string {
  return JSON.stringify({
    label: command.label,
    packagePath: command.packagePath ?? '.',
    scripts: getStatusBarCommandScripts(command),
  });
}

export function getStatusBarCommandScripts(command: StatusBarCommand): string[] {
  if (command.script) {
    return [command.script];
  }

  return command.scripts ?? [];
}

export function getStatusBarExecutionMode(command: StatusBarCommand): StatusBarCommandExecutionMode {
  return command.executionMode ?? 'terminal';
}

export function getStatusBarFailurePolicy(command: StatusBarCommand): StatusBarCommandFailurePolicy {
  return command.failurePolicy ?? 'stop';
}
