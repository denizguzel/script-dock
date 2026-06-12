import * as vscode from 'vscode';
import { getStatusBarCommandRunStatus, onDidChangeStatusBarCommandRunState } from './command-runner';
import { getConfiguredPackageManagerLabel, resolvePackageManager } from './package-manager';
import { createScriptId } from './scripts';
import { createRunCommand } from './terminal';
import { createStatusBarCommandKey, getStatusBarCommandScripts, getStatusBarExecutionMode } from './status-bar-command';
import {
  getConfiguredScripts,
  getRunHistory,
  getStatusBarAlignment,
  getStatusBarCommands,
  getStatusBarPriority,
  getStatusBarPriorityStep,
} from './config';
import type { ResolvedPackageManager, StatusBarCommand } from './types';

export class StatusBarController {
  private readonly items: vscode.StatusBarItem[] = [];

  constructor(private readonly context: vscode.ExtensionContext) {
    this.context.subscriptions.push(onDidChangeStatusBarCommandRunState(() => void this.refresh()));
  }

  async refresh() {
    this.disposeItems();

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const packageManager = workspaceFolder ? await resolvePackageManager(workspaceFolder.uri.fsPath) : undefined;
    const alignment = getStatusBarAlignment();
    const commands = getStatusBarCommands();
    const priority = getStatusBarPriority();
    const priorityStep = getStatusBarPriorityStep();

    commands.forEach((command, index) => {
      const item = vscode.window.createStatusBarItem(alignment, priority - index * priorityStep);

      item.text = createStatusBarText(command);
      item.tooltip = createStatusBarTooltip(command, packageManager);
      item.command = {
        command: 'scriptDock.runStatusBarCommand',
        title: 'Run Status Bar Command',
        arguments: [command],
      };
      item.show();

      this.items.push(item);
      this.context.subscriptions.push(item);
    });
  }

  private disposeItems() {
    while (this.items.length > 0) {
      this.items.pop()?.dispose();
    }
  }
}

function createStatusBarText(command: StatusBarCommand): string {
  const scriptNames = getStatusBarCommandScripts(command);
  const icon = getStatusBarIcon(command, scriptNames);

  return `${icon}${command.label}`;
}

function createStatusBarTooltip(
  command: StatusBarCommand,
  packageManager: ResolvedPackageManager | undefined,
): vscode.MarkdownString {
  const scriptNames = getStatusBarCommandScripts(command);
  const packageManagerLabel = packageManager ?? getConfiguredPackageManagerLabel();
  const executionMode = getStatusBarExecutionMode(command);
  const terminalCommand = createPreviewTerminalCommand(
    packageManagerLabel,
    scriptNames,
    command.autoClose,
    command.packagePath,
  );
  const runStatus = getStatusBarCommandRunStatus(command);
  const lastRun =
    executionMode === 'background'
      ? getRunHistory().find((entry) => entry.commandKey === createStatusBarCommandKey(command))
      : undefined;
  const tooltip = new vscode.MarkdownString('', true);

  tooltip.isTrusted = false;
  tooltip.appendMarkdown(`**Script Dock: ${command.label}**\n\n`);

  tooltip.appendMarkdown(`Runs: \`${scriptNames.join(' + ')}\`\n\n`);
  tooltip.appendMarkdown(`Package: \`${formatPackagePath(command.packagePath)}\`\n\n`);
  tooltip.appendMarkdown(
    `Mode: ${describeExecutionMode(executionMode, scriptNames, command.autoClose, command.packagePath)}\n\n`,
  );

  if (runStatus.state !== 'idle') {
    tooltip.appendMarkdown(`Status: ${describeRunStatus(runStatus)}\n\n`);
  }

  if (lastRun) {
    tooltip.appendMarkdown(`Last run: ${describeLastRun(lastRun)}\n\n`);
  }

  tooltip.appendMarkdown(`Command: \`${terminalCommand}\``);

  return tooltip;
}

function createPreviewTerminalCommand(
  packageManager: ResolvedPackageManager,
  scriptNames: string[],
  autoClose?: boolean,
  packagePath = '.',
): string {
  const command = scriptNames.map((scriptName) => createRunCommand(packageManager, scriptName)).join(' && ');
  const shouldAutoClose = shouldAutoCloseTerminal(scriptNames, autoClose, packagePath);

  return shouldAutoClose ? `${command} && exit` : command;
}

function formatPackagePath(packagePath?: string): string {
  if (!packagePath || packagePath === '.') {
    return 'Workspace root';
  }

  return packagePath;
}

function describesTerminalLifecycle(scriptNames: string[], autoClose?: boolean, packagePath = '.'): string {
  const shouldAutoClose = shouldAutoCloseTerminal(scriptNames, autoClose, packagePath);

  return shouldAutoClose ? 'closes after a successful run' : 'stays open after running';
}

function getStatusBarIcon(command: StatusBarCommand, scriptNames: string[]): string {
  const runStatus = getStatusBarCommandRunStatus(command);

  if (runStatus.state === 'running') {
    return '$(sync~spin) ';
  }

  if (runStatus.state === 'success') {
    return '$(check) ';
  }

  if (runStatus.state === 'failed') {
    return '$(error) ';
  }

  if (command.icon && command.icon !== 'terminal') {
    return `$(${command.icon}) `;
  }

  return shouldAutoCloseTerminal(scriptNames, command.autoClose, command.packagePath)
    ? '$(debug-disconnect) '
    : '$(terminal) ';
}

function shouldAutoCloseTerminal(scriptNames: string[], autoClose?: boolean, packagePath = '.'): boolean {
  return (
    autoClose ??
    scriptNames.every((scriptName) =>
      getConfiguredScripts('autoCloseScripts').includes(createScriptId(packagePath, scriptName)),
    )
  );
}

function describeExecutionMode(
  executionMode: ReturnType<typeof getStatusBarExecutionMode>,
  scriptNames: string[],
  autoClose?: boolean,
  packagePath = '.',
): string {
  if (executionMode === 'background') {
    return 'runs in the background and writes to the Script Dock output';
  }

  return `opens a terminal and ${describesTerminalLifecycle(scriptNames, autoClose, packagePath)}`;
}

function describeRunStatus(runStatus: ReturnType<typeof getStatusBarCommandRunStatus>): string {
  if (runStatus.state === 'running') {
    return 'running';
  }

  if (runStatus.state === 'success') {
    return 'finished successfully';
  }

  const exitCode = runStatus.exitCode === undefined ? '' : ` (${describeExitCode(runStatus.exitCode)})`;

  return `${runStatus.message ?? 'failed'}${exitCode}`;
}

function describeLastRun(lastRun: NonNullable<ReturnType<typeof getRunHistory>[number]>): string {
  const status = lastRun.success ? 'success' : 'failed';
  const exitCode = lastRun.exitCode === undefined ? '' : `, ${describeExitCode(lastRun.exitCode)}`;
  const duration = lastRun.durationMs === undefined ? '' : `, ${Math.round(lastRun.durationMs / 100) / 10}s`;

  return `${status}${exitCode}${duration} at ${new Date(lastRun.endedAt).toLocaleString()}`;
}

function describeExitCode(exitCode: number | null | undefined): string {
  if (exitCode === undefined) {
    return '';
  }

  if (exitCode === null) {
    return 'terminated';
  }

  return `exit code ${exitCode}`;
}
