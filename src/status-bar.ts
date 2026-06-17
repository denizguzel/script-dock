import * as vscode from 'vscode';
import { getStatusBarCommandRunStatus, onDidChangeStatusBarCommandRunState } from './command-runner';
import { getConfiguredPackageManagerLabel, resolvePackageManager } from './package-manager';
import { createScriptId } from './scripts';
import { createRunCommand } from './terminal';
import { getStatusBarCommandScripts, getStatusBarExecutionMode } from './status-bar-command';
import {
  getConfiguredScripts,
  getStatusBarAlignment,
  getStatusBarCommands,
  getStatusBarDisplayMode,
  getStatusBarOverflowLimit,
  getStatusBarPriority,
  getStatusBarPriorityStep,
  shouldShowStatusBarScripts,
} from './config';
import type { ResolvedPackageManager, StatusBarCommand } from './types';

export class StatusBarController implements vscode.Disposable {
  private readonly items: vscode.StatusBarItem[] = [];
  private readonly runStateSubscription: vscode.Disposable;
  private refreshId = 0;

  constructor() {
    this.runStateSubscription = onDidChangeStatusBarCommandRunState(() => void this.refresh());
  }

  async refresh() {
    const refreshId = ++this.refreshId;

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const packageManager = workspaceFolder ? await resolvePackageManager(workspaceFolder.uri.fsPath) : undefined;

    if (refreshId !== this.refreshId) {
      return;
    }

    this.disposeItems();

    if (!shouldShowStatusBarScripts()) {
      return;
    }

    const alignment = getStatusBarAlignment();
    const commands = getStatusBarCommands();
    const priority = getStatusBarPriority();
    const priorityStep = getStatusBarPriorityStep();

    if (getStatusBarDisplayMode() === 'compact') {
      const item = vscode.window.createStatusBarItem(alignment, priority);

      item.text = createCompactStatusBarText(commands);
      item.tooltip = createCompactStatusBarTooltip(commands);
      item.command = {
        command: 'scriptDock.pickStatusBarCommand',
        title: 'Run Pinned Script',
      };
      item.show();

      this.items.push(item);
      return;
    }

    const overflowLimit = getStatusBarOverflowLimit();
    const visibleCommands =
      overflowLimit > 0 && commands.length > overflowLimit ? commands.slice(0, overflowLimit) : commands;
    const overflowCommands = overflowLimit > 0 && commands.length > overflowLimit ? commands.slice(overflowLimit) : [];

    visibleCommands.forEach((command, index) => {
      const item = vscode.window.createStatusBarItem(alignment, priority - index * priorityStep);

      item.text = createStatusBarText(command);
      item.tooltip = createStatusBarTooltip(command, packageManager);
      item.command = {
        command: 'scriptDock.runStatusBarCommand',
        title: createStatusBarCommandTitle(command),
        arguments: [command],
      };
      item.show();

      this.items.push(item);
    });

    if (overflowCommands.length === 0) {
      return;
    }

    const overflowItem = vscode.window.createStatusBarItem(alignment, priority - visibleCommands.length * priorityStep);

    overflowItem.text = createOverflowStatusBarText(overflowCommands);
    overflowItem.tooltip = createOverflowStatusBarTooltip(overflowCommands);
    overflowItem.command = {
      command: 'scriptDock.pickStatusBarCommand',
      title: 'Run Overflow Pinned Script',
    };
    overflowItem.show();

    this.items.push(overflowItem);
  }

  dispose() {
    this.runStateSubscription.dispose();
    this.disposeItems();
  }

  private disposeItems() {
    while (this.items.length > 0) {
      this.items.pop()?.dispose();
    }
  }
}

function createOverflowStatusBarText(commands: StatusBarCommand[]): string {
  if (commands.some((command) => getStatusBarCommandRunStatus(command).state === 'running')) {
    return `$(sync~spin) ${commands.length} more`;
  }

  if (commands.some((command) => getStatusBarCommandRunStatus(command).state === 'failed')) {
    return `$(error) ${commands.length} more`;
  }

  if (commands.some((command) => getStatusBarCommandRunStatus(command).state === 'cancelled')) {
    return `$(circle-slash) ${commands.length} more`;
  }

  return `$(more) ${commands.length} more`;
}

function createOverflowStatusBarTooltip(commands: StatusBarCommand[]): vscode.MarkdownString {
  const tooltip = new vscode.MarkdownString('', true);

  tooltip.isTrusted = false;
  tooltip.appendMarkdown('**Script Dock overflow**\n\n');
  tooltip.appendMarkdown('Click to run a pinned script.\n\n');
  tooltip.appendMarkdown(commands.map((command) => `- ${describeCompactCommand(command)}`).join('\n'));

  return tooltip;
}

function createCompactStatusBarText(commands: StatusBarCommand[]): string {
  if (commands.some((command) => getStatusBarCommandRunStatus(command).state === 'running')) {
    return '$(sync~spin) Script Dock';
  }

  if (commands.some((command) => getStatusBarCommandRunStatus(command).state === 'failed')) {
    return '$(error) Script Dock';
  }

  if (commands.some((command) => getStatusBarCommandRunStatus(command).state === 'cancelled')) {
    return '$(circle-slash) Script Dock';
  }

  return '$(play-circle) Script Dock';
}

function createCompactStatusBarTooltip(commands: StatusBarCommand[]): vscode.MarkdownString {
  const tooltip = new vscode.MarkdownString('', true);

  tooltip.isTrusted = false;
  tooltip.appendMarkdown('**Script Dock**\n\n');

  if (commands.length === 0) {
    tooltip.appendMarkdown('No pinned scripts configured.');
    return tooltip;
  }

  tooltip.appendMarkdown('Click to run a pinned script.\n\n');
  tooltip.appendMarkdown(commands.map((command) => `- ${describeCompactCommand(command)}`).join('\n'));

  return tooltip;
}

function describeCompactCommand(command: StatusBarCommand): string {
  const runStatus = getStatusBarCommandRunStatus(command);
  const status = runStatus.state === 'idle' ? '' : ` - ${describeRunStatus(runStatus)}`;

  return `\`${command.label}\` runs \`${getStatusBarCommandScripts(command).join(' + ')}\`${status}`;
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
  const tooltip = new vscode.MarkdownString('', true);

  tooltip.isTrusted = false;
  tooltip.appendMarkdown(`**Script Dock: ${command.label}**\n\n`);

  tooltip.appendMarkdown(`Runs: \`${scriptNames.join(' + ')}\`\n\n`);
  tooltip.appendMarkdown(
    `Mode: ${describeExecutionMode(executionMode, scriptNames, command.autoClose, command.packagePath)}\n\n`,
  );

  if (runStatus.state !== 'idle') {
    tooltip.appendMarkdown(`Status: ${describeRunStatus(runStatus)}\n\n`);
  }

  tooltip.appendMarkdown(`Action: ${describeClickAction(runStatus, executionMode)}\n\n`);
  tooltip.appendMarkdown(`Package: \`${formatPackagePath(command.packagePath)}\`\n\n`);
  tooltip.appendMarkdown(`Terminal: \`${terminalCommand}\``);

  return tooltip;
}

function createStatusBarCommandTitle(command: StatusBarCommand): string {
  if (getStatusBarCommandRunStatus(command).state !== 'running') {
    return 'Run Pinned Script';
  }

  return getStatusBarExecutionMode(command) === 'terminal' ? 'Stop Pinned Script Terminal' : 'Cancel Pinned Script';
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
    return '$(debug-stop) ';
  }

  if (runStatus.state === 'success') {
    return '$(check) ';
  }

  if (runStatus.state === 'cancelled') {
    return '$(circle-slash) ';
  }

  if (runStatus.state === 'failed') {
    return '$(error) ';
  }

  if (command.icon && command.icon !== 'terminal') {
    return `$(${command.icon}) `;
  }

  return shouldAutoCloseTerminal(scriptNames, command.autoClose, command.packagePath)
    ? '$(debug-disconnect) '
    : '$(play-circle) ';
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

function describeClickAction(
  runStatus: ReturnType<typeof getStatusBarCommandRunStatus>,
  executionMode: ReturnType<typeof getStatusBarExecutionMode>,
): string {
  if (runStatus.state === 'running') {
    return executionMode === 'terminal' ? 'Click to stop the terminal run.' : 'Click to cancel.';
  }

  if (runStatus.state === 'failed') {
    return 'Click to rerun.';
  }

  return 'Click to run.';
}

function describeRunStatus(runStatus: ReturnType<typeof getStatusBarCommandRunStatus>): string {
  if (runStatus.state === 'running') {
    return runStatus.message ?? 'running';
  }

  if (runStatus.state === 'success') {
    return 'finished successfully';
  }

  if (runStatus.state === 'cancelled') {
    return runStatus.message ?? 'cancelled';
  }

  const exitCode = runStatus.exitCode === undefined ? '' : ` (${describeExitCode(runStatus.exitCode)})`;

  return `${runStatus.message ?? 'failed'}${exitCode}`;
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
