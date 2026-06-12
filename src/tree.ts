import * as vscode from 'vscode';
import { getStatusBarCommandRunStatus } from './command-runner';
import {
  getCommandActivity,
  getCollapsedTreeGroups,
  getConfiguredScripts,
  getRunHistory,
  getStatusBarCommands,
  updateCollapsedTreeGroups,
  updateStatusBarCommands,
} from './config';
import {
  getFavoriteScripts,
  getNonFavoriteScripts,
  getPackageRoots,
  getScriptsForPackageRoots,
  getVisibleScriptsFromScripts,
} from './scripts';
import {
  createStatusBarCommandKey,
  getStatusBarCommandScripts,
  getStatusBarExecutionMode,
  getStatusBarFailurePolicy,
} from './status-bar-command';
import type { PackageRoot, ScriptEntry, StatusBarCommand, StatusBarCommandExecutionMode } from './types';

const statusBarGroupId = 'statusBar';
const favoriteGroupId = 'favorites';
const allScriptsGroupId = 'all';
const statusBarCommandMime = 'application/vnd.code.tree.scriptdock.statusbarcommand';

type ScriptTreeItem = ScriptGroupItem | ScriptItem | StatusBarCommandItem;

class ScriptGroupItem extends vscode.TreeItem {
  constructor(
    public readonly groupId: string,
    label: string,
    public readonly packageRoot?: PackageRoot,
  ) {
    super(label, getGroupCollapsibleState(groupId));

    this.contextValue = 'scriptGroup';
    this.id = createTreeItemId('group', groupId);
    this.iconPath = new vscode.ThemeIcon(getGroupIcon(groupId));
  }
}

export class ScriptItem extends vscode.TreeItem {
  constructor(
    public readonly script: ScriptEntry,
    options: {
      isAutoClose: boolean;
      isFavorite: boolean;
      isStatusBarCommand: boolean;
      statusBarExecutionMode?: StatusBarCommandExecutionMode;
    },
  ) {
    super(script.name, vscode.TreeItemCollapsibleState.None);

    this.contextValue = createScriptContextValue(options);
    this.description = script.command;
    this.id = createTreeItemId('script', script.id);
    this.tooltip = `${script.name}\n${script.command}\n${script.packageRoot.label}`;
    this.iconPath = new vscode.ThemeIcon('play-circle');
    this.command = {
      command: 'scriptDock.runScript',
      title: 'Run Script',
      arguments: [this],
    };
  }

  get packageRoot(): PackageRoot {
    return this.script.packageRoot;
  }

  get scriptCommand(): string {
    return this.script.command;
  }

  get scriptId(): string {
    return this.script.id;
  }

  get scriptName(): string {
    return this.script.name;
  }
}

class StatusBarCommandItem extends vscode.TreeItem {
  constructor(
    public readonly statusBarCommand: StatusBarCommand,
    public readonly index: number,
    allScripts: ScriptEntry[],
  ) {
    super(statusBarCommand.label, vscode.TreeItemCollapsibleState.None);

    const scriptNames = getStatusBarCommandScripts(statusBarCommand);
    const health = getStatusBarCommandHealth(statusBarCommand);
    const missingScripts = getMissingStatusBarScripts(statusBarCommand, allScripts);

    this.contextValue = createStatusBarCommandContextValue(statusBarCommand, missingScripts);
    this.description =
      missingScripts.length > 0
        ? `missing: ${missingScripts.join(', ')}`
        : `${health.shortLabel} - ${scriptNames.join(' + ')}`;
    this.id = createTreeItemId('status-bar-command', createStatusBarCommandKey(statusBarCommand));
    this.tooltip = createStatusBarCommandTooltip(statusBarCommand, scriptNames, health.detail, missingScripts);
    this.iconPath = new vscode.ThemeIcon(
      missingScripts.length > 0 ? 'warning' : getStatusBarCommandIcon(statusBarCommand),
    );
    this.command = {
      command: 'scriptDock.runStatusBarCommand',
      title: 'Run Status Bar Script',
      arguments: [statusBarCommand],
    };
  }
}

export class ScriptsProvider implements vscode.TreeDataProvider<ScriptTreeItem> {
  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<ScriptTreeItem | undefined | void>();

  readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  refresh() {
    this.onDidChangeTreeDataEmitter.fire();
  }

  getTreeItem(element: ScriptTreeItem): vscode.TreeItem {
    return element;
  }

  async collapseGroup(element: ScriptTreeItem) {
    if (!(element instanceof ScriptGroupItem)) {
      return;
    }

    await updateCollapsedTreeGroups([...new Set([...getCollapsedTreeGroups(), element.groupId])]);
  }

  async expandGroup(element: ScriptTreeItem) {
    if (!(element instanceof ScriptGroupItem)) {
      return;
    }

    await updateCollapsedTreeGroups(getCollapsedTreeGroups().filter((groupId) => groupId !== element.groupId));
  }

  async getChildren(element?: ScriptTreeItem): Promise<ScriptTreeItem[]> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

    if (!workspaceFolder) {
      return [];
    }

    const packageRoots = await getPackageRoots(workspaceFolder);
    const allScripts = await getScriptsForPackageRoots(packageRoots);
    const scripts = getVisibleScriptsFromScripts(allScripts);

    if (element instanceof ScriptGroupItem) {
      if (element.groupId === statusBarGroupId) {
        return getStatusBarCommands().map((command, index) => new StatusBarCommandItem(command, index, allScripts));
      }

      if (element.packageRoot) {
        return getNonFavoriteScripts(scripts)
          .filter((script) => script.packageRoot.packagePath === element.packageRoot?.packagePath)
          .map((script) => createScriptItem(script));
      }

      const groupScripts =
        element.groupId === favoriteGroupId ? getFavoriteScripts(scripts) : getNonFavoriteScripts(scripts);

      return groupScripts.map((script) => createScriptItem(script));
    }

    const groups: ScriptTreeItem[] = [];

    if (getStatusBarCommands().length > 0) {
      groups.push(new ScriptGroupItem(statusBarGroupId, 'Pinned Scripts'));
    }

    if (getFavoriteScripts(scripts).length > 0) {
      groups.push(new ScriptGroupItem(favoriteGroupId, 'Favorites'));
    }

    if (getNonFavoriteScripts(scripts).length > 0) {
      const packageRoots = new Map(
        getNonFavoriteScripts(scripts).map((script) => [script.packageRoot.packagePath, script.packageRoot]),
      );

      if (packageRoots.size > 1) {
        for (const packageRoot of packageRoots.values()) {
          groups.push(
            new ScriptGroupItem(`${allScriptsGroupId}:${packageRoot.packagePath}`, packageRoot.label, packageRoot),
          );
        }
      } else {
        groups.push(new ScriptGroupItem(allScriptsGroupId, 'All Scripts'));
      }
    }

    return groups;
  }
}

export class ScriptsDragAndDropController implements vscode.TreeDragAndDropController<ScriptTreeItem> {
  readonly dragMimeTypes = [statusBarCommandMime];
  readonly dropMimeTypes = [statusBarCommandMime];

  handleDrag(source: readonly ScriptTreeItem[], dataTransfer: vscode.DataTransfer) {
    const [item] = source;

    if (!(item instanceof StatusBarCommandItem)) {
      return;
    }

    dataTransfer.set(
      statusBarCommandMime,
      new vscode.DataTransferItem({
        index: item.index,
        key: createStatusBarCommandKey(item.statusBarCommand),
      }),
    );
  }

  async handleDrop(target: ScriptTreeItem | undefined, dataTransfer: vscode.DataTransfer) {
    const item = dataTransfer.get(statusBarCommandMime);

    if (!item || (!isStatusBarDropTarget(target) && target !== undefined)) {
      return;
    }

    const payload = await readDragPayload(item);

    if (!payload) {
      return;
    }

    const commands = getStatusBarCommands();
    const sourceIndex = findCommandIndex(commands, payload);

    if (sourceIndex === -1) {
      return;
    }

    const targetIndex = target instanceof StatusBarCommandItem ? target.index : commands.length;
    const nextCommands = moveArrayItem(commands, sourceIndex, targetIndex);

    await updateStatusBarCommands(nextCommands);
  }
}

function createScriptItem(script: ScriptEntry): ScriptItem {
  const statusBarCommand = getSingleScriptStatusBarCommand(script);
  const options = {
    isAutoClose: getConfiguredScripts('autoCloseScripts').includes(script.id),
    isFavorite: getConfiguredScripts('favoriteScripts').includes(script.id),
    isStatusBarCommand: statusBarCommand !== undefined,
  };

  if (!statusBarCommand) {
    return new ScriptItem(script, options);
  }

  return new ScriptItem(script, {
    ...options,
    statusBarExecutionMode: getStatusBarExecutionMode(statusBarCommand),
  });
}

function getGroupIcon(groupId: string): string {
  if (groupId === statusBarGroupId) {
    return 'layout-statusbar';
  }

  return groupId === favoriteGroupId ? 'star-full' : 'package';
}

function getGroupCollapsibleState(groupId: string): vscode.TreeItemCollapsibleState {
  return getCollapsedTreeGroups().includes(groupId)
    ? vscode.TreeItemCollapsibleState.Collapsed
    : vscode.TreeItemCollapsibleState.Expanded;
}

function createTreeItemId(kind: string, value: string): string {
  return `${kind}:${encodeURIComponent(value)}`;
}

function formatPackagePath(packagePath?: string): string {
  if (!packagePath || packagePath === '.') {
    return 'Workspace root';
  }

  return packagePath;
}

function getStatusBarCommandIcon(command: StatusBarCommand): string {
  return command.icon ?? (getStatusBarExecutionMode(command) === 'background' ? 'server-process' : 'terminal');
}

function createStatusBarCommandTooltip(
  command: StatusBarCommand,
  scriptNames: string[],
  health: string,
  missingScripts: string[],
): string {
  const lines = [
    `Status bar script: ${command.label}`,
    `Runs: ${scriptNames.join(' + ')}`,
    `Mode: ${describeStatusBarCommandMode(command)}`,
    health,
    `Package: ${formatPackagePath(command.packagePath)}`,
  ];

  if (missingScripts.length > 0) {
    lines.splice(3, 0, `Missing: ${missingScripts.join(', ')}`);
  }

  return lines.join('\n');
}

function describeStatusBarCommandMode(command: StatusBarCommand): string {
  return getStatusBarExecutionMode(command) === 'background' ? 'Background output' : 'Terminal';
}

function createStatusBarCommandContextValue(command: StatusBarCommand, missingScripts: string[]): string {
  const failurePolicy = getStatusBarFailurePolicy(command) === 'continue' ? 'continueOnFailure' : 'stopOnFailure';
  const missingState = missingScripts.length > 0 ? 'missingScript' : 'validScript';

  return `statusBarCommand ${failurePolicy} ${missingState}`;
}

function getStatusBarCommandHealth(command: StatusBarCommand): { detail: string; shortLabel: string } {
  const runStatus = getStatusBarCommandRunStatus(command);

  if (runStatus.state === 'running') {
    return { detail: 'Currently running', shortLabel: 'running' };
  }

  if (runStatus.state === 'failed') {
    return { detail: 'Current background run failed', shortLabel: 'failed' };
  }

  if (runStatus.state === 'success') {
    return { detail: 'Current background run finished successfully', shortLabel: 'ok now' };
  }

  const lastRun = getRunHistory().find((entry) => entry.commandKey === createStatusBarCommandKey(command));

  if (lastRun?.success) {
    return { detail: 'Last background run: successful', shortLabel: 'last ok' };
  }

  if (lastRun) {
    return { detail: 'Last background run: failed', shortLabel: 'last failed' };
  }

  const activity = getCommandActivity().find((entry) => entry.commandKey === createStatusBarCommandKey(command));

  if (activity?.mode === 'terminal') {
    return { detail: 'Opened in terminal; result is not tracked', shortLabel: 'terminal' };
  }

  if (activity) {
    return { detail: 'Started in background', shortLabel: 'started' };
  }

  return {
    detail: 'No background run recorded yet',
    shortLabel: 'not run',
  };
}

function isStatusBarDropTarget(target: ScriptTreeItem | undefined): boolean {
  return (
    target instanceof StatusBarCommandItem || (target instanceof ScriptGroupItem && target.groupId === statusBarGroupId)
  );
}

async function readDragPayload(item: vscode.DataTransferItem): Promise<{ index: number; key: string } | undefined> {
  const value = item.value;

  if (isDragPayload(value)) {
    return value;
  }

  try {
    const parsed: unknown = JSON.parse(await item.asString());

    return isDragPayload(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function isDragPayload(value: unknown): value is { index: number; key: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'index' in value &&
    'key' in value &&
    typeof value.index === 'number' &&
    typeof value.key === 'string'
  );
}

function findCommandIndex(commands: StatusBarCommand[], payload: { index: number; key: string }): number {
  const command = commands[payload.index];

  if (command && createStatusBarCommandKey(command) === payload.key) {
    return payload.index;
  }

  return commands.findIndex((item) => createStatusBarCommandKey(item) === payload.key);
}

function moveArrayItem<T>(items: T[], sourceIndex: number, targetIndex: number): T[] {
  const nextItems = [...items];
  const [item] = nextItems.splice(sourceIndex, 1);

  if (!item) {
    return items;
  }

  nextItems.splice(targetIndex, 0, item);

  return nextItems;
}

function getSingleScriptStatusBarCommand(script: ScriptEntry) {
  return getStatusBarCommands().find((command) => {
    const scriptNames = getStatusBarCommandScripts(command);

    return (
      scriptNames.length === 1 &&
      scriptNames[0] === script.name &&
      (command.packagePath ?? '.') === script.packageRoot.packagePath
    );
  });
}

function getMissingStatusBarScripts(command: StatusBarCommand, allScripts: ScriptEntry[]): string[] {
  const packagePath = command.packagePath ?? '.';

  return getStatusBarCommandScripts(command).filter(
    (scriptName) =>
      !allScripts.some((script) => script.name === scriptName && script.packageRoot.packagePath === packagePath),
  );
}

function createScriptContextValue(options: {
  isAutoClose: boolean;
  isFavorite: boolean;
  isStatusBarCommand: boolean;
  statusBarExecutionMode?: StatusBarCommandExecutionMode;
}): string {
  const autoCloseState = options.isAutoClose ? 'autoClose' : 'notAutoClose';
  const favoriteState = options.isFavorite ? 'favorite' : 'notFavorite';
  const statusBarState = options.isStatusBarCommand ? 'statusBar' : 'notStatusBar';
  const executionModeState =
    options.statusBarExecutionMode === undefined ? 'noStatusBarMode' : `${options.statusBarExecutionMode}Mode`;

  return `script ${favoriteState} ${statusBarState} ${autoCloseState} ${executionModeState}`;
}
