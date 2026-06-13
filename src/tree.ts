import * as vscode from 'vscode';
import { getStatusBarCommandRunStatus } from './command-runner';
import {
  getCollapsedTreeGroups,
  getConfiguredScripts,
  getStatusBarCommands,
  updateCollapsedTreeGroups,
  updateScriptListPreference,
  updateStatusBarCommands,
} from './config';
import {
  getFavoriteScripts,
  getNonFavoriteScripts,
  getPackageRoots,
  getScriptsForPackageRoots,
  getVisibleScriptsFromScripts,
} from './scripts';
import { createStatusBarCommandKey, getStatusBarCommandScripts, getStatusBarExecutionMode } from './status-bar-command';
import type { PackageRoot, ScriptEntry, StatusBarCommand, StatusBarCommandExecutionMode } from './types';

const statusBarGroupId = 'statusBar';
const favoriteGroupId = 'favorites';
const allScriptsGroupId = 'all';
const statusBarCommandMime = 'application/vnd.code.tree.scriptdock.statusbarcommand';
const favoriteScriptMime = 'application/vnd.code.tree.scriptdock.favoritescript';

type ScriptTreeItem = LoadingItem | EmptyStateItem | ScriptGroupItem | ScriptItem | StatusBarCommandItem;
type ReorderItem = StatusBarCommand | string;

interface ReorderSpec {
  canDrag: (item: ScriptTreeItem) => boolean;
  canDrop: (target: ScriptTreeItem | undefined) => boolean;
  getItemKey: (item: ReorderItem) => string;
  getItems: () => ReorderItem[];
  getKey: (item: ScriptTreeItem) => string;
  getSourceIndex: (item: ScriptTreeItem, items: ReorderItem[]) => number;
  getTargetIndex: (target: ScriptTreeItem | undefined, items: ReorderItem[]) => number;
  mimeType: string;
  updateItems: (items: ReorderItem[]) => Promise<void>;
}

class LoadingItem extends vscode.TreeItem {
  constructor() {
    super('Loading workspace scripts...', vscode.TreeItemCollapsibleState.None);

    this.contextValue = 'loading';
    this.id = 'loading';
    this.iconPath = new vscode.ThemeIcon('sync~spin');
  }
}

class EmptyStateItem extends vscode.TreeItem {
  constructor(
    id: string,
    label: string,
    options: {
      command?: vscode.Command;
      description?: string;
      icon: string;
      tooltip: string;
    },
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);

    this.contextValue = 'emptyState';
    this.id = `empty:${id}`;
    this.iconPath = new vscode.ThemeIcon(options.icon);
    this.tooltip = options.tooltip;

    if (options.command) {
      this.command = options.command;
    }

    if (options.description) {
      this.description = options.description;
    }
  }
}

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
    const runState = getStatusBarCommandRunState(statusBarCommand);
    const missingScripts = getMissingStatusBarScripts(statusBarCommand, allScripts);

    this.contextValue = createStatusBarCommandContextValue(statusBarCommand, missingScripts);
    this.description = createStatusBarCommandDescription(scriptNames, missingScripts);
    this.id = createTreeItemId('status-bar-command', createStatusBarCommandKey(statusBarCommand));
    this.tooltip = createStatusBarCommandTooltip(statusBarCommand, scriptNames, runState.detail, missingScripts);
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
  private allScripts: ScriptEntry[] = [];
  private isLoading = true;
  private packageRoots: PackageRoot[] = [];
  private scripts: ScriptEntry[] = [];
  private updateId = 0;

  readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  refresh() {
    this.onDidChangeTreeDataEmitter.fire();
  }

  refreshFromPreferences() {
    this.scripts = getVisibleScriptsFromScripts(this.allScripts);
    this.refresh();
  }

  async reload() {
    const updateId = ++this.updateId;

    this.isLoading = true;
    this.refresh();

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const packageRoots = workspaceFolder ? await getPackageRoots(workspaceFolder) : [];
    const allScripts = await getScriptsForPackageRoots(packageRoots);

    if (updateId !== this.updateId) {
      return;
    }

    this.packageRoots = packageRoots;
    this.allScripts = allScripts;
    this.scripts = getVisibleScriptsFromScripts(allScripts);
    this.isLoading = false;
    this.refresh();
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

  getChildren(element?: ScriptTreeItem): ScriptTreeItem[] {
    if (this.isLoading) {
      return element ? [] : [new LoadingItem()];
    }

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

    if (!workspaceFolder) {
      return element ? [] : [createNoWorkspaceItem()];
    }

    if (this.packageRoots.length === 0) {
      return element ? [] : [createNoPackageJsonItem()];
    }

    if (this.allScripts.length === 0) {
      return element ? [] : [createNoScriptsItem()];
    }

    if (this.scripts.length === 0) {
      return element ? [] : [createAllScriptsHiddenItem()];
    }

    if (element instanceof ScriptGroupItem) {
      if (element.groupId === statusBarGroupId) {
        return getStatusBarCommands().map(
          (command, index) => new StatusBarCommandItem(command, index, this.allScripts),
        );
      }

      if (element.packageRoot) {
        return getNonFavoriteScripts(this.scripts)
          .filter((script) => script.packageRoot.packagePath === element.packageRoot?.packagePath)
          .map((script) => createScriptItem(script));
      }

      const groupScripts =
        element.groupId === favoriteGroupId ? getFavoriteScripts(this.scripts) : getNonFavoriteScripts(this.scripts);

      return groupScripts.map((script) => createScriptItem(script));
    }

    const groups: ScriptTreeItem[] = [];

    if (getStatusBarCommands().length > 0) {
      groups.push(new ScriptGroupItem(statusBarGroupId, 'Pinned Scripts'));
    }

    if (getFavoriteScripts(this.scripts).length > 0) {
      groups.push(new ScriptGroupItem(favoriteGroupId, 'Favorites'));
    }

    if (getNonFavoriteScripts(this.scripts).length > 0) {
      const packageRoots = new Map(
        getNonFavoriteScripts(this.scripts).map((script) => [script.packageRoot.packagePath, script.packageRoot]),
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
  private readonly reorderSpecs: ReorderSpec[] = [
    {
      canDrag: (item) => item instanceof StatusBarCommandItem,
      canDrop: (target) =>
        target === undefined ||
        target instanceof StatusBarCommandItem ||
        (target instanceof ScriptGroupItem && target.groupId === statusBarGroupId),
      getItems: getStatusBarCommands,
      getItemKey: (item) => (isStatusBarCommand(item) ? createStatusBarCommandKey(item) : ''),
      getKey: (item) => (item instanceof StatusBarCommandItem ? createStatusBarCommandKey(item.statusBarCommand) : ''),
      getSourceIndex: (item) => (item instanceof StatusBarCommandItem ? item.index : -1),
      getTargetIndex: (target, items) => (target instanceof StatusBarCommandItem ? target.index : items.length),
      mimeType: statusBarCommandMime,
      updateItems: (items) => updateStatusBarCommands(items.filter(isStatusBarCommand)),
    },
    {
      canDrag: (item) => item instanceof ScriptItem && getConfiguredScripts('favoriteScripts').includes(item.scriptId),
      canDrop: (target) =>
        target === undefined ||
        (target instanceof ScriptItem && getConfiguredScripts('favoriteScripts').includes(target.scriptId)) ||
        (target instanceof ScriptGroupItem && target.groupId === favoriteGroupId),
      getItems: () => getConfiguredScripts('favoriteScripts'),
      getItemKey: (item) => (typeof item === 'string' ? item : ''),
      getKey: (item) => (item instanceof ScriptItem ? item.scriptId : ''),
      getSourceIndex: (item, items) => (item instanceof ScriptItem ? items.indexOf(item.scriptId) : -1),
      getTargetIndex: (target, items) => (target instanceof ScriptItem ? items.indexOf(target.scriptId) : items.length),
      mimeType: favoriteScriptMime,
      updateItems: (items) => updateScriptListPreference('favoriteScripts', items.filter(isString)),
    },
  ];

  readonly dragMimeTypes = this.reorderSpecs.map((spec) => spec.mimeType);
  readonly dropMimeTypes = this.dragMimeTypes;

  handleDrag(source: readonly ScriptTreeItem[], dataTransfer: vscode.DataTransfer) {
    const [item] = source;

    if (!item) {
      return;
    }

    for (const spec of this.reorderSpecs) {
      if (!spec.canDrag(item)) {
        continue;
      }

      const items = spec.getItems();
      const payload = {
        index: spec.getSourceIndex(item, items),
        key: spec.getKey(item),
      };

      if (payload.index === -1 || payload.key === '') {
        continue;
      }

      dataTransfer.set(spec.mimeType, new vscode.DataTransferItem(payload));
      return;
    }
  }

  async handleDrop(target: ScriptTreeItem | undefined, dataTransfer: vscode.DataTransfer) {
    for (const spec of this.reorderSpecs) {
      const item = dataTransfer.get(spec.mimeType);

      if (!item || !spec.canDrop(target)) {
        continue;
      }

      const payload = await readDragPayload(item);

      if (!payload) {
        continue;
      }

      const items = spec.getItems();
      const sourceIndex = findItemIndex(items, payload, spec.getItemKey);
      const targetIndex = spec.getTargetIndex(target, items);

      if (sourceIndex === -1 || targetIndex === -1) {
        continue;
      }

      await spec.updateItems(moveArrayItem(items, sourceIndex, targetIndex));
      return;
    }
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

function createNoWorkspaceItem(): EmptyStateItem {
  return new EmptyStateItem('no-workspace', 'Open a workspace folder to use Script Dock.', {
    icon: 'folder-opened',
    tooltip: 'Script Dock scans package.json files in the open workspace.',
  });
}

function createNoPackageJsonItem(): EmptyStateItem {
  return new EmptyStateItem('no-package-json', 'No package.json found in this workspace.', {
    command: {
      command: 'scriptDock.refreshScripts',
      title: 'Refresh Scripts',
    },
    description: 'click to refresh',
    icon: 'warning',
    tooltip: 'Click to scan the workspace again.',
  });
}

function createNoScriptsItem(): EmptyStateItem {
  return new EmptyStateItem('no-scripts', 'No package scripts found.', {
    command: {
      command: 'scriptDock.refreshScripts',
      title: 'Refresh Scripts',
    },
    description: 'click to refresh',
    icon: 'info',
    tooltip: 'Add a scripts section to package.json, then refresh Script Dock.',
  });
}

function createAllScriptsHiddenItem(): EmptyStateItem {
  return new EmptyStateItem('all-hidden', 'All package scripts are hidden.', {
    command: {
      command: 'scriptDock.showHiddenScript',
      title: 'Show Hidden Script',
    },
    description: 'click to show one',
    icon: 'eye-closed',
    tooltip: 'Click to choose a hidden script to show again.',
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
  const runStatus = getStatusBarCommandRunStatus(command);

  if (runStatus.state === 'running') {
    return 'sync~spin';
  }

  if (runStatus.state === 'failed') {
    return 'error';
  }

  if (runStatus.state === 'cancelled') {
    return 'circle-slash';
  }

  if (runStatus.state === 'success') {
    return 'check';
  }

  return command.icon ?? (getStatusBarExecutionMode(command) === 'background' ? 'server-process' : 'terminal');
}

function createStatusBarCommandTooltip(
  command: StatusBarCommand,
  scriptNames: string[],
  runStateDetail: string | undefined,
  missingScripts: string[],
): string {
  const lines = [
    `Status bar script: ${command.label}`,
    `Runs: ${scriptNames.join(' + ')}`,
    `Mode: ${describeStatusBarCommandMode(command)}`,
    `Package: ${formatPackagePath(command.packagePath)}`,
  ];

  if (missingScripts.length > 0) {
    lines.splice(3, 0, `Missing: ${missingScripts.join(', ')}`);
  } else if (runStateDetail) {
    lines.splice(3, 0, runStateDetail);
  }

  return lines.join('\n');
}

function describeStatusBarCommandMode(command: StatusBarCommand): string {
  return getStatusBarExecutionMode(command) === 'background' ? 'Background output' : 'Terminal';
}

function createStatusBarCommandContextValue(command: StatusBarCommand, missingScripts: string[]): string {
  const missingState = missingScripts.length > 0 ? 'missingScript' : 'validScript';
  const runState = getStatusBarCommandRunStatus(command).state;

  return `statusBarCommand ${missingState} ${runState}`;
}

function createStatusBarCommandDescription(scriptNames: string[], missingScripts: string[]): string {
  if (missingScripts.length > 0) {
    return `missing: ${missingScripts.join(', ')}`;
  }

  return scriptNames.join(' + ');
}

function getStatusBarCommandRunState(command: StatusBarCommand): { detail?: string } {
  const runStatus = getStatusBarCommandRunStatus(command);

  if (runStatus.state === 'running') {
    return { detail: 'Currently running' };
  }

  if (runStatus.state === 'failed') {
    return { detail: 'Current background run failed' };
  }

  if (runStatus.state === 'cancelled') {
    return { detail: 'Current background run cancelled' };
  }

  if (runStatus.state === 'success') {
    return { detail: 'Current background run finished successfully' };
  }

  return {};
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

function findItemIndex(
  items: ReorderItem[],
  payload: { index: number; key: string },
  getItemKey: (item: ReorderItem) => string,
): number {
  const item = items[payload.index];

  if (item && getItemKey(item) === payload.key) {
    return payload.index;
  }

  return items.findIndex((itemToCheck) => getItemKey(itemToCheck) === payload.key);
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

function isStatusBarCommand(value: ReorderItem): value is StatusBarCommand {
  return typeof value === 'object' && value !== null && 'label' in value && typeof value.label === 'string';
}

function isString(value: ReorderItem): value is string {
  return typeof value === 'string';
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
