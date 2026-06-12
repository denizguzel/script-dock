import * as vscode from 'vscode';
import { getConfiguredScripts, getStatusBarCommands } from './config';
import { getFavoriteScripts, getNonFavoriteScripts, getVisibleScripts } from './scripts';
import { getStatusBarCommandScripts, getStatusBarExecutionMode } from './status-bar-command';
import type { StatusBarCommandExecutionMode } from './types';

const favoriteGroupId = 'favorites';
const allScriptsGroupId = 'all';

type ScriptTreeItem = ScriptGroupItem | ScriptItem;

class ScriptGroupItem extends vscode.TreeItem {
  constructor(
    public readonly groupId: string,
    label: string,
  ) {
    super(label, vscode.TreeItemCollapsibleState.Expanded);

    this.contextValue = 'scriptGroup';
    this.iconPath = new vscode.ThemeIcon(groupId === favoriteGroupId ? 'star-full' : 'list-tree');
  }
}

export class ScriptItem extends vscode.TreeItem {
  constructor(
    public readonly scriptName: string,
    public readonly scriptCommand: string,
    public readonly workspaceFolder: vscode.WorkspaceFolder,
    options: {
      isAutoClose: boolean;
      isFavorite: boolean;
      isStatusBarCommand: boolean;
      statusBarExecutionMode?: StatusBarCommandExecutionMode;
    },
  ) {
    super(scriptName, vscode.TreeItemCollapsibleState.None);

    this.contextValue = createScriptContextValue(options);
    this.description = scriptCommand;
    this.tooltip = `${scriptName}\n${scriptCommand}`;
    this.iconPath = new vscode.ThemeIcon('play-circle');
    this.command = {
      command: 'scriptDock.runScript',
      title: 'Run Script',
      arguments: [this],
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
      const groupScripts =
        element.groupId === favoriteGroupId ? getFavoriteScripts(scripts) : getNonFavoriteScripts(scripts);

      return groupScripts.map((script) => createScriptItem(script.name, script.command, workspaceFolder));
    }

    const groups: ScriptGroupItem[] = [];

    if (getFavoriteScripts(scripts).length > 0) {
      groups.push(new ScriptGroupItem(favoriteGroupId, 'Favorites'));
    }

    if (getNonFavoriteScripts(scripts).length > 0) {
      groups.push(new ScriptGroupItem(allScriptsGroupId, 'All Scripts'));
    }

    return groups;
  }
}

function createScriptItem(name: string, command: string, workspaceFolder: vscode.WorkspaceFolder): ScriptItem {
  const statusBarCommand = getSingleScriptStatusBarCommand(name);
  const options = {
    isAutoClose: getConfiguredScripts('autoCloseScripts').includes(name),
    isFavorite: getConfiguredScripts('favoriteScripts').includes(name),
    isStatusBarCommand: statusBarCommand !== undefined,
  };

  if (!statusBarCommand) {
    return new ScriptItem(name, command, workspaceFolder, options);
  }

  return new ScriptItem(name, command, workspaceFolder, {
    ...options,
    statusBarExecutionMode: getStatusBarExecutionMode(statusBarCommand),
  });
}

function getSingleScriptStatusBarCommand(scriptName: string) {
  return getStatusBarCommands().find((command) => {
    const scriptNames = getStatusBarCommandScripts(command);

    return scriptNames.length === 1 && scriptNames[0] === scriptName;
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
