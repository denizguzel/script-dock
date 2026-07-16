import * as vscode from 'vscode';
import {
  addSuggestedChains,
  addStatusBarCommand,
  createScriptChain,
  editScriptChain,
  moveStatusBarCommandsLeft,
  moveStatusBarCommandsRight,
  pickAndRunStatusBarCommand,
  removeStatusBarCommand,
  resetWorkspacePreferencesCommand,
  runScript,
  runStatusBarCommand,
  searchScripts,
  showHiddenScript,
  stopBackgroundStatusBarCommand,
  updateStatusBarCommandExecutionMode,
  updateScriptListSetting,
  useCompactStatusBar,
  useExpandedStatusBar,
} from './commands';
import { disposeCommandRunner, onDidChangeStatusBarCommandRunState } from './command-runner';
import {
  configurationSection,
  getStatusBarAlignmentPreference,
  getStatusBarDisplayMode,
  initializeWorkspacePreferences,
  onDidChangeWorkspacePreferences,
  shouldShowStatusBarScripts,
} from './config';
import { ScriptDockViewProvider } from './script-dock-view';
import { StatusBarController } from './status-bar';
import type { ScriptEntry } from './types';

export function activate(context: vscode.ExtensionContext) {
  initializeWorkspacePreferences(context.workspaceState);

  const statusBarController = new StatusBarController();
  const scriptDockViewProvider = new ScriptDockViewProvider(context.extensionUri, context.workspaceState, {
    addSuggestedChains,
    createScriptChain: () => createScriptChain(context.extensionUri),
    editScriptChain: (command) => editScriptChain(context.extensionUri, command),
    resetWorkspacePreferences: resetWorkspacePreferencesCommand,
    showHiddenScript,
  });
  const packageJsonWatcher = vscode.workspace.createFileSystemWatcher('**/package.json');
  let packageJsonReloadTimeout: ReturnType<typeof setTimeout> | undefined;
  const reloadScriptsAfterPackageJsonChange = () => {
    clearTimeout(packageJsonReloadTimeout);
    packageJsonReloadTimeout = setTimeout(() => {
      packageJsonReloadTimeout = undefined;
      void scriptDockViewProvider.reload();
    }, 150);
  };

  context.subscriptions.push(
    statusBarController,
    scriptDockViewProvider,
    packageJsonWatcher,
    packageJsonWatcher.onDidChange(reloadScriptsAfterPackageJsonChange),
    packageJsonWatcher.onDidCreate(reloadScriptsAfterPackageJsonChange),
    packageJsonWatcher.onDidDelete(reloadScriptsAfterPackageJsonChange),
    {
      dispose: () => clearTimeout(packageJsonReloadTimeout),
    },
    vscode.window.registerWebviewViewProvider('scriptDock.scripts', scriptDockViewProvider),
    { dispose: disposeCommandRunner },
    vscode.commands.registerCommand('scriptDock.refreshScripts', () => void scriptDockViewProvider.reload()),
    vscode.commands.registerCommand('scriptDock.runScript', runScript),
    vscode.commands.registerCommand('scriptDock.runStatusBarCommand', runStatusBarCommand),
    vscode.commands.registerCommand('scriptDock.pickStatusBarCommand', pickAndRunStatusBarCommand),
    vscode.commands.registerCommand('scriptDock.searchScripts', searchScripts),
    vscode.commands.registerCommand('scriptDock.createScriptChain', () => createScriptChain(context.extensionUri)),
    vscode.commands.registerCommand('scriptDock.editScriptChain', (item?: unknown) =>
      editScriptChain(context.extensionUri, item),
    ),
    vscode.commands.registerCommand('scriptDock.addSuggestedChains', addSuggestedChains),
    vscode.commands.registerCommand('scriptDock.resetWorkspacePreferences', resetWorkspacePreferencesCommand),
    vscode.commands.registerCommand('scriptDock.addStatusBarCommand', addStatusBarCommand),
    vscode.commands.registerCommand('scriptDock.removeStatusBarCommand', removeStatusBarCommand),
    vscode.commands.registerCommand('scriptDock.runStatusBarCommandInBackground', (script?: ScriptEntry) =>
      updateStatusBarCommandExecutionMode(script, 'background'),
    ),
    vscode.commands.registerCommand('scriptDock.runStatusBarCommandInTerminal', (script?: ScriptEntry) =>
      updateStatusBarCommandExecutionMode(script, 'terminal'),
    ),
    vscode.commands.registerCommand('scriptDock.stopBackgroundStatusBarCommand', stopBackgroundStatusBarCommand),
    vscode.commands.registerCommand('scriptDock.moveStatusBarCommandsLeft', moveStatusBarCommandsLeft),
    vscode.commands.registerCommand('scriptDock.moveStatusBarCommandsRight', moveStatusBarCommandsRight),
    vscode.commands.registerCommand('scriptDock.useCompactStatusBar', useCompactStatusBar),
    vscode.commands.registerCommand('scriptDock.useExpandedStatusBar', useExpandedStatusBar),
    vscode.commands.registerCommand('scriptDock.enableAutoClose', (script?: ScriptEntry) =>
      updateScriptListSetting('autoCloseScripts', script, 'add'),
    ),
    vscode.commands.registerCommand('scriptDock.disableAutoClose', (script?: ScriptEntry) =>
      updateScriptListSetting('autoCloseScripts', script, 'remove'),
    ),
    vscode.commands.registerCommand('scriptDock.hideScript', (script?: ScriptEntry) =>
      updateScriptListSetting('hideScripts', script, 'add'),
    ),
    vscode.commands.registerCommand('scriptDock.showHiddenScript', showHiddenScript),
    onDidChangeStatusBarCommandRunState(() => {
      scriptDockViewProvider.refresh();
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(configurationSection)) {
        void scriptDockViewProvider.reload();
        void vscode.commands.executeCommand(
          'setContext',
          'scriptDock.statusBarAlignment',
          getStatusBarAlignmentPreference(),
        );
        void vscode.commands.executeCommand('setContext', 'scriptDock.statusBarDisplayMode', getStatusBarDisplayMode());
        void vscode.commands.executeCommand(
          'setContext',
          'scriptDock.showStatusBarScripts',
          shouldShowStatusBarScripts(),
        );
        void statusBarController.refresh();
        scriptDockViewProvider.refresh();
      }
    }),
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      void scriptDockViewProvider.reload();
    }),
    onDidChangeWorkspacePreferences(() => {
      scriptDockViewProvider.refreshFromPreferences();
      void vscode.commands.executeCommand(
        'setContext',
        'scriptDock.statusBarAlignment',
        getStatusBarAlignmentPreference(),
      );
      void vscode.commands.executeCommand('setContext', 'scriptDock.statusBarDisplayMode', getStatusBarDisplayMode());
      void vscode.commands.executeCommand(
        'setContext',
        'scriptDock.showStatusBarScripts',
        shouldShowStatusBarScripts(),
      );
      void statusBarController.refresh();
      scriptDockViewProvider.refresh();
    }),
  );

  void vscode.commands.executeCommand('setContext', 'scriptDock.statusBarAlignment', getStatusBarAlignmentPreference());
  void vscode.commands.executeCommand('setContext', 'scriptDock.statusBarDisplayMode', getStatusBarDisplayMode());
  void vscode.commands.executeCommand('setContext', 'scriptDock.showStatusBarScripts', shouldShowStatusBarScripts());
  void scriptDockViewProvider.reload();
  void statusBarController.refresh();
  scriptDockViewProvider.refresh();
}

export function deactivate() {}
