import * as vscode from 'vscode';
import { getStatusBarCommandRunStatus, onDidChangeStatusBarCommandRunState } from './command-runner';
import { getConfiguredPackageManagerLabel, resolvePackageManager } from './package-manager';
import { createRunCommand } from './terminal';
import { getStatusBarCommandScripts, getStatusBarExecutionMode } from './status-bar-command';
import {
  getConfiguredScripts,
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
  const terminalCommand = createPreviewTerminalCommand(packageManagerLabel, scriptNames, command.autoClose);
  const runStatus = getStatusBarCommandRunStatus(command);
  const tooltip = new vscode.MarkdownString('', true);

  tooltip.isTrusted = false;
  tooltip.appendMarkdown(`**Script Dock: ${command.label}**\n\n`);
  tooltip.appendMarkdown(`Runs: \`${scriptNames.join(' + ')}\`\n\n`);
  tooltip.appendMarkdown(`Mode: ${describeExecutionMode(executionMode, scriptNames, command.autoClose)}\n\n`);

  if (runStatus.state !== 'idle') {
    tooltip.appendMarkdown(`Status: ${describeRunStatus(runStatus)}\n\n`);
  }

  tooltip.appendMarkdown(`Command: \`${terminalCommand}\``);

  return tooltip;
}

function createPreviewTerminalCommand(
  packageManager: ResolvedPackageManager,
  scriptNames: string[],
  autoClose?: boolean,
): string {
  const command = scriptNames.map((scriptName) => createRunCommand(packageManager, scriptName)).join(' && ');
  const shouldAutoClose = shouldAutoCloseTerminal(scriptNames, autoClose);

  return shouldAutoClose ? `${command} && exit` : command;
}

function describesTerminalLifecycle(scriptNames: string[], autoClose?: boolean): string {
  const shouldAutoClose = shouldAutoCloseTerminal(scriptNames, autoClose);

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

  return shouldAutoCloseTerminal(scriptNames, command.autoClose) ? '$(debug-disconnect) ' : '$(terminal) ';
}

function shouldAutoCloseTerminal(scriptNames: string[], autoClose?: boolean): boolean {
  return autoClose ?? scriptNames.every((scriptName) => getConfiguredScripts('autoCloseScripts').includes(scriptName));
}

function describeExecutionMode(
  executionMode: ReturnType<typeof getStatusBarExecutionMode>,
  scriptNames: string[],
  autoClose?: boolean,
): string {
  if (executionMode === 'background') {
    return 'runs in the background and writes to the Script Dock output';
  }

  return `opens a terminal and ${describesTerminalLifecycle(scriptNames, autoClose)}`;
}

function describeRunStatus(runStatus: ReturnType<typeof getStatusBarCommandRunStatus>): string {
  if (runStatus.state === 'running') {
    return 'running';
  }

  if (runStatus.state === 'success') {
    return 'finished successfully';
  }

  const exitCode = runStatus.exitCode === undefined ? '' : ` (exit code ${runStatus.exitCode})`;

  return `${runStatus.message ?? 'failed'}${exitCode}`;
}
