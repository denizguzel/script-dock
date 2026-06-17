import * as vscode from 'vscode';
import { getStatusBarCommandRunStatus, stopStatusBarCommand } from './command-runner';
import {
  addStatusBarCommand,
  runScript,
  runStatusBarCommand,
  updatePinnedScriptExecutionMode,
  updateScriptListSetting,
} from './commands';
import {
  getConfiguredScripts,
  getStatusBarAlignmentPreference,
  getStatusBarCommands,
  getStatusBarDisplayMode,
  shouldShowStatusBarScripts,
  updateScriptListPreference,
  updateShowStatusBarScripts,
  updateStatusBarAlignment,
  updateStatusBarCommands,
  updateStatusBarDisplayMode,
} from './config';
import { getPackageRoots, getScriptsForPackageRoots } from './scripts';
import { createStatusBarCommandKey, getStatusBarCommandScripts, getStatusBarExecutionMode } from './status-bar-command';
import type {
  PackageRoot,
  ScriptFilter,
  ScriptEntry,
  StatusBarAlignmentPreference,
  StatusBarCommand,
  StatusBarCommandExecutionMode,
  StatusBarDisplayMode,
} from './types';
import { createWebviewHtml } from './webview-html';

interface ScriptViewModel {
  autoClose: boolean;
  command: string;
  executionMode: StatusBarCommandExecutionMode | null;
  id: string;
  isFavorite: boolean;
  isHidden: boolean;
  isPinned: boolean;
  name: string;
  packageLabel: string;
  packagePath: string;
  runStatus: ReturnType<typeof getStatusBarCommandRunStatus>;
}

interface PinnedScriptViewModel {
  executionMode: StatusBarCommandExecutionMode;
  key: string;
  label: string;
  missingScripts: string[];
  packagePath: string;
  runStatus: ReturnType<typeof getStatusBarCommandRunStatus>;
  scripts: string[];
}

interface ScriptDockState {
  allScripts: ScriptViewModel[];
  empty: {
    kind: 'allHidden' | 'none' | 'noPackageJson' | 'noScripts' | 'noWorkspace';
    message: string;
  };
  favoriteScripts: ScriptViewModel[];
  hiddenScripts: ScriptViewModel[];
  hiddenScriptCount: number;
  isLoading: boolean;
  packageRootCount: number;
  pinnedScripts: PinnedScriptViewModel[];
  selectedFilter: ScriptFilter;
  selectedPinnedKey: string | null;
  statusBar: {
    alignment: StatusBarAlignmentPreference;
    displayMode: StatusBarDisplayMode;
    visible: boolean;
  };
  workspaceName: string | null;
}

type ScriptDockMessage =
  | { type: 'addSuggestedChains' }
  | { type: 'createChain' }
  | { type: 'editPinned'; key?: string }
  | { type: 'exportProfile' }
  | { type: 'hideScript'; scriptId?: string }
  | { type: 'importProfile' }
  | { type: 'moveFavoriteDown'; scriptId?: string }
  | { type: 'moveFavoriteUp'; scriptId?: string }
  | { type: 'movePinnedDown'; key?: string }
  | { type: 'movePinnedUp'; key?: string }
  | { type: 'ready' }
  | { type: 'refresh' }
  | { type: 'reorderFavorites'; scriptIds?: string[] }
  | { type: 'reorderPinned'; keys?: string[] }
  | { type: 'removePinned'; key?: string }
  | { type: 'resetPreferences' }
  | { type: 'runAllPinned' }
  | { type: 'runPinned'; key?: string }
  | { type: 'runScript'; scriptId?: string }
  | { type: 'selectPinned'; key?: string }
  | { type: 'setAutoClose'; enabled?: boolean; scriptId?: string }
  | { type: 'setFavorite'; enabled?: boolean; scriptId?: string }
  | { filter?: ScriptFilter; type: 'setFilter' }
  | { type: 'setHidden'; enabled?: boolean; scriptId?: string }
  | { type: 'setPinned'; enabled?: boolean; scriptId?: string }
  | { type: 'setPinnedMode'; key?: string; mode?: StatusBarCommandExecutionMode }
  | { type: 'setScriptMode'; mode?: StatusBarCommandExecutionMode; scriptId?: string }
  | { type: 'showHiddenScript' }
  | { type: 'stopAllPinned' }
  | { type: 'statusBarAlignment'; alignment?: StatusBarAlignmentPreference }
  | { type: 'statusBarDisplayMode'; displayMode?: StatusBarDisplayMode }
  | { type: 'statusBarVisible'; visible?: boolean };

interface ScriptDockHandlers {
  addSuggestedChains: () => Promise<void> | void;
  createScriptChain: () => Promise<void> | void;
  editScriptChain: (command: StatusBarCommand) => Promise<void> | void;
  resetWorkspacePreferences: () => Promise<void> | void;
  showHiddenScript: () => Promise<void> | void;
}

const selectedPinnedKeyStorageKey = 'scriptDock.selectedPinnedKey';
const selectedFilterStorageKey = 'scriptDock.selectedFilter';

export class ScriptDockViewProvider implements vscode.WebviewViewProvider, vscode.Disposable {
  private allScripts: ScriptEntry[] = [];
  private isLoading = true;
  private packageRoots: PackageRoot[] = [];
  private updateId = 0;
  private view: vscode.WebviewView | undefined;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly workspaceState: vscode.Memento,
    private readonly handlers: ScriptDockHandlers,
  ) {}

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'dist', 'webviews')],
    };
    webviewView.webview.html = this.createHtml(webviewView.webview);
    webviewView.webview.onDidReceiveMessage((message: unknown) => void this.handleMessage(message));
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
    this.isLoading = false;
    this.refresh();
  }

  refresh() {
    void this.view?.webview.postMessage({
      state: this.createState(),
      type: 'state',
    });
  }

  refreshFromPreferences() {
    this.refresh();
  }

  dispose() {
    this.view = undefined;
  }

  private async handleMessage(rawMessage: unknown) {
    const message = parseMessage(rawMessage);

    if (!message) {
      return;
    }

    if (message.type === 'ready') {
      this.refresh();
      return;
    }

    if (message.type === 'refresh') {
      await this.reload();
      return;
    }

    if (message.type === 'createChain') {
      await this.handlers.createScriptChain();
      this.refresh();
      return;
    }

    if (message.type === 'addSuggestedChains') {
      await this.handlers.addSuggestedChains();
      this.refresh();
      return;
    }

    if (message.type === 'showHiddenScript') {
      await this.handlers.showHiddenScript();
      this.refresh();
      return;
    }

    if (message.type === 'resetPreferences') {
      await this.handlers.resetWorkspacePreferences();
      this.refresh();
      return;
    }

    if (message.type === 'exportProfile') {
      await this.exportProfile();
      return;
    }

    if (message.type === 'importProfile') {
      await this.importProfile();
      this.refresh();
      return;
    }

    if (message.type === 'statusBarVisible') {
      await updateShowStatusBarScripts(message.visible === true);
      this.refresh();
      return;
    }

    if (message.type === 'statusBarDisplayMode' && isStatusBarDisplayMode(message.displayMode)) {
      await updateStatusBarDisplayMode(message.displayMode);
      this.refresh();
      return;
    }

    if (message.type === 'statusBarAlignment' && isStatusBarAlignment(message.alignment)) {
      await updateStatusBarAlignment(message.alignment);
      this.refresh();
      return;
    }

    if (message.type === 'setFilter' && isScriptFilter(message.filter)) {
      await this.setSelectedFilter(message.filter);
      this.refresh();
      return;
    }

    if (message.type === 'runScript') {
      const script = this.findScript(message.scriptId);

      if (script) {
        await runScript(script);
      }

      this.refresh();
      return;
    }

    if (message.type === 'setFavorite') {
      await this.updateScriptPreference('favoriteScripts', message.scriptId, message.enabled === true);
      this.refresh();
      return;
    }

    if (message.type === 'setAutoClose') {
      await this.updateScriptPreference('autoCloseScripts', message.scriptId, message.enabled === true);
      this.refresh();
      return;
    }

    if (message.type === 'hideScript') {
      const script = this.findScript(message.scriptId);

      if (script) {
        await updateScriptListSetting('hideScripts', script, 'add');
      }

      this.refresh();
      return;
    }

    if (message.type === 'setHidden') {
      await this.updateScriptPreference('hideScripts', message.scriptId, message.enabled === true);
      this.refresh();
      return;
    }

    if (message.type === 'setPinned') {
      const script = this.findScript(message.scriptId);

      if (script) {
        if (message.enabled === true) {
          await addStatusBarCommand(script);
        } else {
          await this.removeSingleScriptCommand(script);
        }
      }

      this.refresh();
      return;
    }

    if (message.type === 'setScriptMode' && isStatusBarExecutionMode(message.mode)) {
      const script = this.findScript(message.scriptId);
      const command = script ? this.findSingleScriptCommand(script) : undefined;

      if (command) {
        await updatePinnedScriptExecutionMode(command, message.mode);
      }

      this.refresh();
      return;
    }

    if (message.type === 'reorderFavorites' && Array.isArray(message.scriptIds)) {
      await this.reorderFavorites(message.scriptIds);
      this.refresh();
      return;
    }

    if (message.type === 'moveFavoriteUp' || message.type === 'moveFavoriteDown') {
      await this.moveFavorite(message.scriptId, message.type === 'moveFavoriteUp' ? -1 : 1);
      this.refresh();
      return;
    }

    if (message.type === 'reorderPinned' && Array.isArray(message.keys)) {
      await this.reorderPinned(message.keys);
      this.refresh();
      return;
    }

    if (message.type === 'movePinnedUp' || message.type === 'movePinnedDown') {
      await this.movePinned(message.key, message.type === 'movePinnedUp' ? -1 : 1);
      this.refresh();
      return;
    }

    if (message.type === 'removePinned') {
      await this.removePinned(message.key);
      this.refresh();
      return;
    }

    if (message.type === 'runAllPinned') {
      await this.runAllPinned();
      this.refresh();
      return;
    }

    if (message.type === 'stopAllPinned') {
      await this.stopAllPinned();
      this.refresh();
      return;
    }

    if (!hasPinnedCommandKey(message)) {
      return;
    }

    const command = this.findPinnedCommand(message.key);

    if (!command) {
      return;
    }

    if (message.type === 'selectPinned') {
      await this.setSelectedPinnedKey(createStatusBarCommandKey(command));
      this.refresh();
      return;
    }

    if (message.type === 'runPinned') {
      await this.setSelectedPinnedKey(createStatusBarCommandKey(command));
      await runStatusBarCommand(command);
      this.refresh();
      return;
    }

    if (message.type === 'editPinned') {
      await this.setSelectedPinnedKey(createStatusBarCommandKey(command));
      await this.handlers.editScriptChain(command);
      this.refresh();
      return;
    }

    if (message.type === 'setPinnedMode' && isStatusBarExecutionMode(message.mode)) {
      await updatePinnedScriptExecutionMode(command, message.mode);
      this.refresh();
    }
  }

  private createState(): ScriptDockState {
    const favoriteIds = new Set(getConfiguredScripts('favoriteScripts'));
    const hiddenIds = new Set(getConfiguredScripts('hideScripts'));
    const autoCloseIds = new Set(getConfiguredScripts('autoCloseScripts'));
    const commands = getStatusBarCommands();
    const commandScriptKeys = new Set(
      commands
        .filter((command) => getStatusBarCommandScripts(command).length === 1)
        .map((command) =>
          createSingleScriptKey(getCommandPackagePath(command), getStatusBarCommandScripts(command)[0]),
        ),
    );
    const scripts = this.allScripts.map((script) =>
      createScriptViewModel(script, {
        autoCloseIds,
        commandScriptKeys,
        favoriteIds,
        hiddenIds,
        statusBarCommands: commands,
      }),
    );
    const visibleScripts = scripts.filter((script) => !script.isHidden);

    return {
      allScripts: visibleScripts.filter((script) => !script.isFavorite),
      empty: createEmptyState({
        allScriptCount: this.allScripts.length,
        isLoading: this.isLoading,
        packageRootCount: this.packageRoots.length,
        visibleScriptCount: visibleScripts.length,
      }),
      favoriteScripts: visibleScripts.filter((script) => script.isFavorite),
      hiddenScripts: scripts.filter((script) => script.isHidden),
      hiddenScriptCount: hiddenIds.size,
      isLoading: this.isLoading,
      packageRootCount: this.packageRoots.length,
      pinnedScripts: commands.map((command) => createPinnedViewModel(command, this.allScripts)),
      selectedFilter: this.getSelectedFilter(),
      selectedPinnedKey: this.getSelectedPinnedKey(commands),
      statusBar: {
        alignment: getStatusBarAlignmentPreference(),
        displayMode: getStatusBarDisplayMode(),
        visible: shouldShowStatusBarScripts(),
      },
      workspaceName: vscode.workspace.workspaceFolders?.[0]?.name ?? null,
    };
  }

  private findScript(scriptId: string | undefined): ScriptEntry | undefined {
    if (!scriptId) {
      return undefined;
    }

    return this.allScripts.find((script) => script.id === scriptId);
  }

  private findPinnedCommand(key: string | undefined): StatusBarCommand | undefined {
    const commands = getStatusBarCommands();
    const selectedKey = key ?? this.getSelectedPinnedKey(commands);

    return commands.find((command) => createStatusBarCommandKey(command) === selectedKey);
  }

  private findSingleScriptCommand(script: ScriptEntry): StatusBarCommand | undefined {
    return getStatusBarCommands().find((command) => {
      const scriptNames = getStatusBarCommandScripts(command);

      return (
        scriptNames.length === 1 &&
        scriptNames[0] === script.name &&
        getCommandPackagePath(command) === script.packageRoot.packagePath
      );
    });
  }

  private async removeSingleScriptCommand(script: ScriptEntry) {
    const commands = getStatusBarCommands();
    const nextCommands = commands.filter((command) => {
      const scriptNames = getStatusBarCommandScripts(command);

      return !(
        scriptNames.length === 1 &&
        scriptNames[0] === script.name &&
        getCommandPackagePath(command) === script.packageRoot.packagePath
      );
    });

    await updateStatusBarCommands(nextCommands);
  }

  private async updateScriptPreference(
    key: 'autoCloseScripts' | 'favoriteScripts' | 'hideScripts',
    scriptId: string | undefined,
    enabled: boolean,
  ) {
    if (!scriptId) {
      return;
    }

    const currentValue = getConfiguredScripts(key);
    const currentSet = new Set(currentValue);

    if (enabled) {
      currentSet.add(scriptId);
    } else {
      currentSet.delete(scriptId);
    }

    await updateScriptListPreference(key, [...currentSet]);
  }

  private async reorderFavorites(scriptIds: string[]) {
    const currentFavorites = getConfiguredScripts('favoriteScripts');
    const nextOrderedFavorites = scriptIds.filter((scriptId) => currentFavorites.includes(scriptId));
    const remainingFavorites = currentFavorites.filter((scriptId) => !nextOrderedFavorites.includes(scriptId));

    await updateScriptListPreference('favoriteScripts', [...nextOrderedFavorites, ...remainingFavorites]);
  }

  private async reorderPinned(keys: string[]) {
    const commands = getStatusBarCommands();
    const commandByKey = new Map(commands.map((command) => [createStatusBarCommandKey(command), command]));
    const nextCommands = keys
      .map((key) => commandByKey.get(key))
      .filter((command): command is StatusBarCommand => command !== undefined);
    const remainingCommands = commands.filter((command) => !keys.includes(createStatusBarCommandKey(command)));

    await updateStatusBarCommands([...nextCommands, ...remainingCommands]);
  }

  private async moveFavorite(scriptId: string | undefined, delta: -1 | 1) {
    if (!scriptId) {
      return;
    }

    await updateScriptListPreference(
      'favoriteScripts',
      moveStringItem(getConfiguredScripts('favoriteScripts'), scriptId, delta),
    );
  }

  private async movePinned(key: string | undefined, delta: -1 | 1) {
    if (!key) {
      return;
    }

    const commands = getStatusBarCommands();
    const commandKeys = commands.map((command) => createStatusBarCommandKey(command));
    const nextKeys = moveStringItem(commandKeys, key, delta);
    const nextCommandByKey = new Map(commands.map((command) => [createStatusBarCommandKey(command), command]));
    const nextCommands = nextKeys
      .map((nextKey) => nextCommandByKey.get(nextKey))
      .filter((command): command is StatusBarCommand => command !== undefined);

    await updateStatusBarCommands(nextCommands);
  }

  private async removePinned(key: string | undefined) {
    if (!key) {
      return;
    }

    await updateStatusBarCommands(
      getStatusBarCommands().filter((command) => createStatusBarCommandKey(command) !== key),
    );
  }

  private async runAllPinned() {
    for (const command of getStatusBarCommands()) {
      if (getStatusBarCommandRunStatus(command).state !== 'running') {
        void runStatusBarCommand(command);
      }
    }
  }

  private async stopAllPinned() {
    for (const command of getStatusBarCommands()) {
      if (getStatusBarCommandRunStatus(command).state === 'running') {
        await stopStatusBarCommand(command);
      }
    }
  }

  private async exportProfile() {
    const defaultUri = vscode.workspace.workspaceFolders?.[0]
      ? vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, 'script-dock-profile.json')
      : undefined;
    const saveUri = await vscode.window.showSaveDialog({
      ...(defaultUri ? { defaultUri } : {}),
      filters: { JSON: ['json'] },
      saveLabel: 'Export Profile',
      title: 'Export Script Dock Profile',
    });

    if (!saveUri) {
      return;
    }

    const profile = createWorkspaceProfile();
    await vscode.workspace.fs.writeFile(saveUri, Buffer.from(`${JSON.stringify(profile, null, 2)}\n`, 'utf8'));
    void vscode.window.showInformationMessage('Script Dock profile exported.');
  }

  private async importProfile() {
    const [openUri] =
      (await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: { JSON: ['json'] },
        openLabel: 'Import Profile',
        title: 'Import Script Dock Profile',
      })) ?? [];

    if (!openUri) {
      return;
    }

    let profile: unknown;

    try {
      profile = JSON.parse(Buffer.from(await vscode.workspace.fs.readFile(openUri)).toString('utf8'));
    } catch {
      void vscode.window.showErrorMessage('Script Dock could not read that profile JSON.');
      return;
    }

    const importResult = validateWorkspaceProfile(profile, this.allScripts);

    if (!importResult.profile) {
      void vscode.window.showErrorMessage('That file is not a valid Script Dock profile.');
      return;
    }

    if (importResult.missingScriptCount > 0 || importResult.invalidPinnedCount > 0) {
      const choice = await vscode.window.showWarningMessage(
        `Profile has ${importResult.missingScriptCount} missing script references and ${importResult.invalidPinnedCount} invalid pinned scripts for this workspace.`,
        'Import Valid Items',
        'Cancel',
      );

      if (choice !== 'Import Valid Items') {
        return;
      }
    }

    await applyWorkspaceProfile(importResult.profile);
    void vscode.window.showInformationMessage('Script Dock profile imported.');
  }

  private getSelectedPinnedKey(commands: StatusBarCommand[]): string | null {
    const savedKey = this.workspaceState.get<string>(selectedPinnedKeyStorageKey);

    if (savedKey && commands.some((command) => createStatusBarCommandKey(command) === savedKey)) {
      return savedKey;
    }

    const [firstCommand] = commands;

    return firstCommand ? createStatusBarCommandKey(firstCommand) : null;
  }

  private async setSelectedPinnedKey(key: string) {
    await this.workspaceState.update(selectedPinnedKeyStorageKey, key);
  }

  private getSelectedFilter(): ScriptFilter {
    const savedFilter = this.workspaceState.get<ScriptFilter>(selectedFilterStorageKey);

    return isScriptFilter(savedFilter) ? savedFilter : 'all';
  }

  private async setSelectedFilter(filter: ScriptFilter) {
    await this.workspaceState.update(selectedFilterStorageKey, filter);
  }

  private createHtml(webview: vscode.Webview): string {
    return createWebviewHtml({
      extensionUri: this.extensionUri,
      scriptFileName: 'launcher.js',
      state: this.createState(),
      stateGlobalName: '__SCRIPT_DOCK_LAUNCHER_STATE__',
      title: 'Script Dock',
      webview,
    });
  }
}

function createScriptViewModel(
  script: ScriptEntry,
  options: {
    autoCloseIds: Set<string>;
    commandScriptKeys: Set<string | undefined>;
    favoriteIds: Set<string>;
    hiddenIds: Set<string>;
    statusBarCommands: StatusBarCommand[];
  },
): ScriptViewModel {
  const singleCommand = options.statusBarCommands.find((command) => {
    const scriptNames = getStatusBarCommandScripts(command);

    return (
      scriptNames.length === 1 &&
      scriptNames[0] === script.name &&
      getCommandPackagePath(command) === script.packageRoot.packagePath
    );
  });

  return {
    autoClose: options.autoCloseIds.has(script.id),
    command: script.command,
    executionMode: singleCommand ? getStatusBarExecutionMode(singleCommand) : null,
    id: script.id,
    isFavorite: options.favoriteIds.has(script.id),
    isHidden: options.hiddenIds.has(script.id),
    isPinned: options.commandScriptKeys.has(createSingleScriptKey(script.packageRoot.packagePath, script.name)),
    name: script.name,
    packageLabel: script.packageRoot.label,
    packagePath: formatPackagePath(script.packageRoot.packagePath),
    runStatus: getStatusBarCommandRunStatus(createScriptRunCommand(script)),
  };
}

function createScriptRunCommand(script: ScriptEntry): StatusBarCommand {
  return {
    executionMode: 'terminal',
    icon: 'play-circle',
    label: script.name,
    packagePath: script.packageRoot.packagePath,
    script: script.name,
  };
}

function createPinnedViewModel(command: StatusBarCommand, allScripts: ScriptEntry[]): PinnedScriptViewModel {
  const scripts = getStatusBarCommandScripts(command);
  const packagePath = getCommandPackagePath(command);

  return {
    executionMode: getStatusBarExecutionMode(command),
    key: createStatusBarCommandKey(command),
    label: command.label,
    missingScripts: scripts.filter(
      (scriptName) =>
        !allScripts.some((script) => script.name === scriptName && script.packageRoot.packagePath === packagePath),
    ),
    packagePath: formatPackagePath(packagePath),
    runStatus: getStatusBarCommandRunStatus(command),
    scripts,
  };
}

function createEmptyState(options: {
  allScriptCount: number;
  isLoading: boolean;
  packageRootCount: number;
  visibleScriptCount: number;
}): ScriptDockState['empty'] {
  if (options.isLoading) {
    return { kind: 'none', message: '' };
  }

  if (!vscode.workspace.workspaceFolders?.[0]) {
    return { kind: 'noWorkspace', message: 'Open a workspace folder to use Script Dock.' };
  }

  if (options.packageRootCount === 0) {
    return { kind: 'noPackageJson', message: 'No package.json found in this workspace.' };
  }

  if (options.allScriptCount === 0) {
    return { kind: 'noScripts', message: 'No package scripts found.' };
  }

  if (options.visibleScriptCount === 0) {
    return { kind: 'allHidden', message: 'All package scripts are hidden.' };
  }

  return { kind: 'none', message: '' };
}

function parseMessage(message: unknown): ScriptDockMessage | undefined {
  if (!isObject(message) || typeof message['type'] !== 'string') {
    return undefined;
  }

  return message as ScriptDockMessage;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStatusBarExecutionMode(value: unknown): value is StatusBarCommandExecutionMode {
  return value === 'background' || value === 'terminal';
}

function isStatusBarAlignment(value: unknown): value is StatusBarAlignmentPreference {
  return value === 'left' || value === 'right';
}

function isStatusBarDisplayMode(value: unknown): value is StatusBarDisplayMode {
  return value === 'compact' || value === 'expanded';
}

function isScriptFilter(value: unknown): value is ScriptFilter {
  return value === 'all' || value === 'favorites' || value === 'hidden' || value === 'pinned' || value === 'runnable';
}

function hasPinnedCommandKey(
  message: ScriptDockMessage,
): message is
  | { type: 'editPinned'; key?: string }
  | { type: 'runPinned'; key?: string }
  | { type: 'selectPinned'; key?: string }
  | { type: 'setPinnedMode'; key?: string; mode?: StatusBarCommandExecutionMode } {
  return (
    message.type === 'editPinned' ||
    message.type === 'runPinned' ||
    message.type === 'selectPinned' ||
    message.type === 'setPinnedMode'
  );
}

function createSingleScriptKey(packagePath: string, scriptName: string | undefined): string | undefined {
  return scriptName ? `${packagePath}:${scriptName}` : undefined;
}

function moveStringItem(items: string[], item: string, delta: -1 | 1): string[] {
  const sourceIndex = items.indexOf(item);
  const targetIndex = sourceIndex + delta;

  if (sourceIndex === -1 || targetIndex < 0 || targetIndex >= items.length) {
    return items;
  }

  const nextItems = [...items];
  const [removedItem] = nextItems.splice(sourceIndex, 1);

  if (!removedItem) {
    return items;
  }

  nextItems.splice(targetIndex, 0, removedItem);

  return nextItems;
}

function getCommandPackagePath(command: StatusBarCommand): string {
  return command.packagePath ?? '.';
}

function formatPackagePath(packagePath?: string): string {
  if (!packagePath || packagePath === '.') {
    return 'Workspace root';
  }

  return packagePath;
}

interface WorkspaceProfile {
  autoCloseScripts: string[];
  favoriteScripts: string[];
  hideScripts: string[];
  showStatusBarScripts: boolean;
  statusBarAlignment: StatusBarAlignmentPreference;
  statusBarCommands: StatusBarCommand[];
  statusBarDisplayMode: StatusBarDisplayMode;
  version: 1;
}

interface WorkspaceProfileValidationResult {
  invalidPinnedCount: number;
  missingScriptCount: number;
  profile?: WorkspaceProfile;
}

function createWorkspaceProfile(): WorkspaceProfile {
  return {
    autoCloseScripts: getConfiguredScripts('autoCloseScripts'),
    favoriteScripts: getConfiguredScripts('favoriteScripts'),
    hideScripts: getConfiguredScripts('hideScripts'),
    showStatusBarScripts: shouldShowStatusBarScripts(),
    statusBarAlignment: getStatusBarAlignmentPreference(),
    statusBarCommands: getStatusBarCommands(),
    statusBarDisplayMode: getStatusBarDisplayMode(),
    version: 1,
  };
}

function validateWorkspaceProfile(value: unknown, allScripts: ScriptEntry[]): WorkspaceProfileValidationResult {
  if (!isObject(value) || value['version'] !== 1) {
    return { invalidPinnedCount: 0, missingScriptCount: 0 };
  }

  const favoriteScripts = readStringArray(value['favoriteScripts']);
  const hideScripts = readStringArray(value['hideScripts']);
  const autoCloseScripts = readStringArray(value['autoCloseScripts']);
  const statusBarCommands = readStatusBarCommands(value['statusBarCommands']);
  const showStatusBarScripts = value['showStatusBarScripts'];
  const statusBarAlignment = value['statusBarAlignment'];
  const statusBarDisplayMode = value['statusBarDisplayMode'];

  if (
    !favoriteScripts ||
    !hideScripts ||
    !autoCloseScripts ||
    !statusBarCommands ||
    typeof showStatusBarScripts !== 'boolean' ||
    !isStatusBarAlignment(statusBarAlignment) ||
    !isStatusBarDisplayMode(statusBarDisplayMode)
  ) {
    return { invalidPinnedCount: 0, missingScriptCount: 0 };
  }

  const validScriptIds = new Set(allScripts.map((script) => script.id));
  const validScriptKeys = new Set(
    allScripts.map((script) => createSingleScriptKey(script.packageRoot.packagePath, script.name)),
  );
  const filterScriptIds = (scriptIds: string[]) => scriptIds.filter((scriptId) => validScriptIds.has(scriptId));
  const validFavoriteScripts = filterScriptIds(favoriteScripts);
  const validHideScripts = filterScriptIds(hideScripts);
  const validAutoCloseScripts = filterScriptIds(autoCloseScripts);
  const missingPreferenceCount =
    favoriteScripts.length -
    validFavoriteScripts.length +
    hideScripts.length -
    validHideScripts.length +
    autoCloseScripts.length -
    validAutoCloseScripts.length;
  let invalidPinnedCount = 0;
  let missingPinnedScriptCount = 0;
  const validStatusBarCommands = statusBarCommands.filter((command) => {
    const packagePath = getCommandPackagePath(command);
    const missingScripts = getStatusBarCommandScripts(command).filter(
      (scriptName) => !validScriptKeys.has(createSingleScriptKey(packagePath, scriptName)),
    );

    if (missingScripts.length === 0) {
      return true;
    }

    invalidPinnedCount += 1;
    missingPinnedScriptCount += missingScripts.length;

    return false;
  });

  return {
    invalidPinnedCount,
    missingScriptCount: missingPreferenceCount + missingPinnedScriptCount,
    profile: {
      autoCloseScripts: validAutoCloseScripts,
      favoriteScripts: validFavoriteScripts,
      hideScripts: validHideScripts,
      showStatusBarScripts,
      statusBarAlignment,
      statusBarCommands: validStatusBarCommands,
      statusBarDisplayMode,
      version: 1,
    },
  };
}

async function applyWorkspaceProfile(profile: WorkspaceProfile) {
  await Promise.all([
    updateScriptListPreference('autoCloseScripts', profile.autoCloseScripts),
    updateScriptListPreference('favoriteScripts', profile.favoriteScripts),
    updateScriptListPreference('hideScripts', profile.hideScripts),
    updateShowStatusBarScripts(profile.showStatusBarScripts),
    updateStatusBarAlignment(profile.statusBarAlignment),
    updateStatusBarCommands(profile.statusBarCommands),
    updateStatusBarDisplayMode(profile.statusBarDisplayMode),
  ]);
}

function readStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    return undefined;
  }

  return value;
}

function readStatusBarCommands(value: unknown): StatusBarCommand[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const commands = value.map((item) => readStatusBarCommand(item));

  if (commands.some((command) => command === undefined)) {
    return undefined;
  }

  return commands.filter((command): command is StatusBarCommand => command !== undefined);
}

function readStatusBarCommand(value: unknown): StatusBarCommand | undefined {
  if (!isObject(value) || typeof value['label'] !== 'string') {
    return undefined;
  }

  const script = value['script'];
  const scripts = readStringArray(value['scripts']);
  const packagePath = value['packagePath'];
  const icon = value['icon'];
  const autoClose = value['autoClose'];
  const executionMode = value['executionMode'];

  if (
    (script !== undefined && typeof script !== 'string') ||
    (value['scripts'] !== undefined && !scripts) ||
    (packagePath !== undefined && typeof packagePath !== 'string') ||
    (icon !== undefined && typeof icon !== 'string') ||
    (autoClose !== undefined && typeof autoClose !== 'boolean') ||
    (executionMode !== undefined && !isStatusBarExecutionMode(executionMode))
  ) {
    return undefined;
  }

  const commandScripts = typeof script === 'string' ? [script] : (scripts ?? []);

  if (commandScripts.length === 0) {
    return undefined;
  }

  return {
    ...(autoClose !== undefined ? { autoClose } : {}),
    ...(executionMode !== undefined ? { executionMode } : {}),
    ...(icon !== undefined ? { icon } : {}),
    label: value['label'],
    ...(packagePath !== undefined ? { packagePath } : {}),
    ...(typeof script === 'string' ? { script } : { scripts: commandScripts }),
  };
}
