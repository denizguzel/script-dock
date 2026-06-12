import * as vscode from 'vscode';
import { getConfiguredScripts, getStatusBarCommands, updateStatusBarCommands } from './config';
import { getFavoriteScripts, getNonFavoriteScripts, getVisibleScripts } from './scripts';
import { createStatusBarCommandKey, getStatusBarCommandScripts, getStatusBarExecutionMode } from './status-bar-command';
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
    super(label, vscode.TreeItemCollapsibleState.Expanded);

    this.contextValue = 'scriptGroup';
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
  ) {
    super(statusBarCommand.label, vscode.TreeItemCollapsibleState.None);

    const scriptNames = getStatusBarCommandScripts(statusBarCommand);

    this.contextValue = 'statusBarCommand';
    this.description = scriptNames.join(' + ');
    this.tooltip = createStatusBarCommandTooltip(statusBarCommand, scriptNames);
    this.iconPath = new vscode.ThemeIcon(getStatusBarCommandIcon(statusBarCommand));
    this.command = {
      command: 'scriptDock.runStatusBarCommand',
      title: 'Run Status Bar Command',
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

  async getChildren(element?: ScriptTreeItem): Promise<ScriptTreeItem[]> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

    if (!workspaceFolder) {
      return [];
    }

    const scripts = await getVisibleScripts(workspaceFolder);

    if (element instanceof ScriptGroupItem) {
      if (element.groupId === statusBarGroupId) {
        return getStatusBarCommands().map((command, index) => new StatusBarCommandItem(command, index));
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

    const groups: ScriptGroupItem[] = [];

    if (getStatusBarCommands().length > 0) {
      groups.push(new ScriptGroupItem(statusBarGroupId, 'Status Bar'));
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

function getStatusBarCommandIcon(command: StatusBarCommand): string {
  if (command.icon) {
    return command.icon;
  }

  return getStatusBarExecutionMode(command) === 'background' ? 'server-process' : 'terminal';
}

function formatPackagePath(packagePath?: string): string {
  if (!packagePath || packagePath === '.') {
    return 'Workspace root';
  }

  return packagePath;
}

function createStatusBarCommandTooltip(command: StatusBarCommand, scriptNames: string[]): string {
  return [
    `Status bar command: ${command.label}`,
    `Runs: ${scriptNames.join(' + ')}`,
    `Package: ${formatPackagePath(command.packagePath)}`,
    `Mode: ${getStatusBarExecutionMode(command)}`,
  ].join('\n');
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
