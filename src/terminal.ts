import * as vscode from 'vscode';
import { getConfiguredScripts } from './config';
import { createScriptId } from './scripts';
import type { ResolvedPackageManager, StatusBarCommandFailurePolicy } from './types';

export function createTerminalCommand(
  packageManager: ResolvedPackageManager,
  scriptNames: string[],
  autoClose?: boolean,
  packagePath = '.',
  failurePolicy: StatusBarCommandFailurePolicy = 'stop',
): string {
  const separator = failurePolicy === 'continue' ? ' ; ' : ' && ';
  const runCommand = scriptNames.map((scriptName) => createRunCommand(packageManager, scriptName)).join(separator);
  const shouldAutoClose =
    autoClose ??
    scriptNames.every((scriptName) =>
      getConfiguredScripts('autoCloseScripts').includes(createScriptId(packagePath, scriptName)),
    );

  if (shouldAutoClose) {
    return `${runCommand} && exit`;
  }

  return runCommand;
}

export function createRunCommand(packageManager: ResolvedPackageManager, scriptName: string): string {
  const escapedScriptName = shellQuote(scriptName);

  if (packageManager === 'npm') {
    return `npm run ${escapedScriptName}`;
  }

  return `${packageManager} run ${escapedScriptName}`;
}

export function runTerminalCommand(options: { command: string; cwd: string; name: string }) {
  const terminal = vscode.window.createTerminal({
    name: options.name,
    cwd: options.cwd,
  });

  terminal.show();
  terminal.sendText(options.command);
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}
