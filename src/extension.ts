import * as vscode from 'vscode';
import {
  addSuggestedChains,
  addStatusBarCommand,
  createScriptChain,
  moveStatusBarCommandsLeft,
  moveStatusBarCommandsRight,
  pickAndRunFavoriteScript,
  pickAndRunStatusBarCommand,
  removeStatusBarCommand,
  resetWorkspacePreferencesCommand,
  runScript,
  runStatusBarCommand,
  searchScripts,
  showRunHistory,
  showHiddenScript,
  updateStatusBarCommandExecutionMode,
  updateScriptListSetting,
  useCompactStatusBar,
  useExpandedStatusBar,
} from './commands';
import { disposeCommandRunner } from './command-runner';
import {
  configurationSection,
  getStatusBarAlignmentPreference,
  getStatusBarDisplayMode,
  initializeWorkspacePreferences,
  onDidChangeWorkspacePreferences,
} from './config';
import { onDidChangeStatusBarCommandRunState } from './command-runner';
import { StatusBarController } from './status-bar';
import { ScriptItem, ScriptsDragAndDropController, ScriptsProvider } from './tree';

export function activate(context: vscode.ExtensionContext) {
  initializeWorkspacePreferences(context.workspaceState);

  const scriptsProvider = new ScriptsProvider();
  const statusBarController = new StatusBarController();
  const scriptsTreeView = vscode.window.createTreeView('scriptDock.scripts', {
    dragAndDropController: new ScriptsDragAndDropController(),
    treeDataProvider: scriptsProvider,
  });

  context.subscriptions.push(
    statusBarController,
    scriptsTreeView,
    scriptsTreeView.onDidCollapseElement((event) => void scriptsProvider.collapseGroup(event.element)),
    scriptsTreeView.onDidExpandElement((event) => void scriptsProvider.expandGroup(event.element)),
    { dispose: disposeCommandRunner },
    vscode.commands.registerCommand('scriptDock.refreshScripts', () => scriptsProvider.refresh()),
    vscode.commands.registerCommand('scriptDock.runScript', runScript),
    vscode.commands.registerCommand('scriptDock.runStatusBarCommand', runStatusBarCommand),
    vscode.commands.registerCommand('scriptDock.pickStatusBarCommand', pickAndRunStatusBarCommand),
    vscode.commands.registerCommand('scriptDock.pickFavoriteScript', pickAndRunFavoriteScript),
    vscode.commands.registerCommand('scriptDock.searchScripts', searchScripts),
    vscode.commands.registerCommand('scriptDock.createScriptChain', createScriptChain),
    vscode.commands.registerCommand('scriptDock.addSuggestedChains', addSuggestedChains),
    vscode.commands.registerCommand('scriptDock.showRunHistory', showRunHistory),
    vscode.commands.registerCommand('scriptDock.resetWorkspacePreferences', resetWorkspacePreferencesCommand),
    vscode.commands.registerCommand('scriptDock.addFavorite', (item?: ScriptItem) =>
      updateScriptListSetting('favoriteScripts', item, 'add'),
    ),
    vscode.commands.registerCommand('scriptDock.removeFavorite', (item?: ScriptItem) =>
      updateScriptListSetting('favoriteScripts', item, 'remove'),
    ),
    vscode.commands.registerCommand('scriptDock.addStatusBarCommand', addStatusBarCommand),
    vscode.commands.registerCommand('scriptDock.removeStatusBarCommand', removeStatusBarCommand),
    vscode.commands.registerCommand('scriptDock.runStatusBarCommandInBackground', (item?: ScriptItem) =>
      updateStatusBarCommandExecutionMode(item, 'background'),
    ),
    vscode.commands.registerCommand('scriptDock.runStatusBarCommandInTerminal', (item?: ScriptItem) =>
      updateStatusBarCommandExecutionMode(item, 'terminal'),
    ),
    vscode.commands.registerCommand('scriptDock.moveStatusBarCommandsLeft', moveStatusBarCommandsLeft),
    vscode.commands.registerCommand('scriptDock.moveStatusBarCommandsRight', moveStatusBarCommandsRight),
    vscode.commands.registerCommand('scriptDock.useCompactStatusBar', useCompactStatusBar),
    vscode.commands.registerCommand('scriptDock.useExpandedStatusBar', useExpandedStatusBar),
    vscode.commands.registerCommand('scriptDock.enableAutoClose', (item?: ScriptItem) =>
      updateScriptListSetting('autoCloseScripts', item, 'add'),
    ),
    vscode.commands.registerCommand('scriptDock.disableAutoClose', (item?: ScriptItem) =>
      updateScriptListSetting('autoCloseScripts', item, 'remove'),
    ),
    vscode.commands.registerCommand('scriptDock.hideScript', (item?: ScriptItem) =>
      updateScriptListSetting('hideScripts', item, 'add'),
    ),
    vscode.commands.registerCommand('scriptDock.showHiddenScript', showHiddenScript),
    onDidChangeStatusBarCommandRunState(() => scriptsProvider.refresh()),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(configurationSection)) {
        scriptsProvider.refresh();
        void vscode.commands.executeCommand(
          'setContext',
          'scriptDock.statusBarAlignment',
          getStatusBarAlignmentPreference(),
        );
        void vscode.commands.executeCommand('setContext', 'scriptDock.statusBarDisplayMode', getStatusBarDisplayMode());
        void statusBarController.refresh();
      }
    }),
    onDidChangeWorkspacePreferences(() => {
      scriptsProvider.refresh();
      void vscode.commands.executeCommand(
        'setContext',
        'scriptDock.statusBarAlignment',
        getStatusBarAlignmentPreference(),
      );
      void vscode.commands.executeCommand('setContext', 'scriptDock.statusBarDisplayMode', getStatusBarDisplayMode());
      void statusBarController.refresh();
    }),
  );

  void vscode.commands.executeCommand('setContext', 'scriptDock.statusBarAlignment', getStatusBarAlignmentPreference());
  void vscode.commands.executeCommand('setContext', 'scriptDock.statusBarDisplayMode', getStatusBarDisplayMode());
  void statusBarController.refresh();
}

export function deactivate() {}
