import * as vscode from 'vscode';
import {
  clearStatusBarCommandRunStatus,
  getStatusBarCommandRunStatus,
  runStatusBarCommandInBackground,
  showCommandOutput,
  stopStatusBarCommand,
} from './command-runner';
import {
  getConfiguredScripts,
  getRunHistory,
  getStatusBarCommands,
  resetWorkspacePreferences,
  updateCommandActivity,
  updateScriptListPreference,
  updateStatusBarAlignment,
  updateStatusBarCommands,
  updateStatusBarDisplayMode,
} from './config';
import { resolvePackageManager } from './package-manager';
import { getAllScripts, getFavoriteScripts, getPackageRoots, getVisibleScripts } from './scripts';
import { createStatusBarCommandKey, getStatusBarCommandScripts, getStatusBarExecutionMode } from './status-bar-command';
import { createTerminalCommand, runTerminalCommand } from './terminal';
import { ScriptItem } from './tree';
import type { PackageRoot, ScriptEntry, StatusBarCommand, StatusBarCommandExecutionMode } from './types';

export async function runScript(item?: ScriptItem) {
  const scriptItem = item ?? (await pickScript());

  if (!scriptItem) {
    return;
  }

  const packageManager = await resolvePackageManager(scriptItem.packageRoot.fsPath);
  const command = createTerminalCommand(
    packageManager,
    [scriptItem.scriptName],
    undefined,
    scriptItem.packageRoot.packagePath,
  );

  runTerminalCommand({
    command,
    cwd: scriptItem.packageRoot.fsPath,
    name: `${packageManager} ${scriptItem.scriptName}`,
  });
}

export async function runStatusBarCommand(command: StatusBarCommand, options: { forceRun?: boolean } = {}) {
  const workspaceFolder = getWorkspaceFolder();

  if (!workspaceFolder) {
    return;
  }

  const scriptNames = getStatusBarCommandScripts(command);

  if (scriptNames.length === 0) {
    vscode.window.showWarningMessage(`Status bar command "${command.label}" has no scripts configured.`);
    return;
  }

  const packageRoot = await getPackageRootForCommand(workspaceFolder, command);

  if (!packageRoot) {
    return;
  }

  const availableScripts = await getAllScripts(workspaceFolder);
  const missingScripts = scriptNames.filter(
    (scriptName) =>
      !availableScripts.some(
        (script) => script.name === scriptName && script.packageRoot.packagePath === packageRoot.packagePath,
      ),
  );

  if (missingScripts.length > 0) {
    vscode.window.showWarningMessage(
      `Missing package script${missingScripts.length > 1 ? 's' : ''}: ${missingScripts.join(', ')}`,
    );
    return;
  }

  const runStatus = getStatusBarCommandRunStatus(command);

  if (!options.forceRun && runStatus.state === 'running') {
    const selected = await vscode.window.showInformationMessage(`${command.label} is running.`, 'Show Output', 'Stop');

    if (selected === 'Stop') {
      stopStatusBarCommand(command);
    } else {
      showCommandOutput();
    }

    return;
  }

  if (!options.forceRun && runStatus.state === 'failed') {
    showCommandOutput();
    const selected = await vscode.window.showWarningMessage(`${command.label} failed.`, 'Run Again');

    if (selected === 'Run Again') {
      await runStatusBarCommand(command, { forceRun: true });
    }

    return;
  }

  const packageManager = await resolvePackageManager(packageRoot.fsPath);
  const executionMode = getStatusBarExecutionMode(command);

  await updateCommandActivity({
    commandKey: createStatusBarCommandKey(command),
    label: command.label,
    mode: executionMode,
    packagePath: packageRoot.packagePath,
    scriptNames,
    startedAt: Date.now(),
  });

  if (executionMode === 'background') {
    const result = await runStatusBarCommandInBackground({
      command,
      cwd: packageRoot.fsPath,
      packageManager,
      packagePath: packageRoot.packagePath,
      scriptNames,
    });

    if (!result.success) {
      const selected = await vscode.window.showErrorMessage(
        createFailureMessage(command.label, result.exitCode, result.outputTail),
        'Show Output',
        'Run Again',
      );

      if (selected === 'Show Output') {
        showCommandOutput();
      } else if (selected === 'Run Again') {
        await runStatusBarCommand(command, { forceRun: true });
      }
    }

    return;
  }

  clearStatusBarCommandRunStatus(command);

  const terminalCommand = createTerminalCommand(
    packageManager,
    scriptNames,
    command.autoClose,
    packageRoot.packagePath,
  );

  runTerminalCommand({
    command: terminalCommand,
    cwd: packageRoot.fsPath,
    name: `${packageManager} ${command.label}`,
  });
}

export async function pickAndRunFavoriteScript() {
  const scriptItem = await pickScript({ favoritesOnly: true });

  if (scriptItem) {
    await runScript(scriptItem);
  }
}

export async function searchScripts() {
  const scriptItem = await pickScript({ placeHolder: 'Search workspace package scripts' });

  if (scriptItem) {
    await runScript(scriptItem);
  }
}

export async function pickAndRunStatusBarCommand() {
  const commands = getStatusBarCommands();

  if (commands.length === 0) {
    vscode.window.showInformationMessage('Add status bar commands before using compact mode.');
    return;
  }

  const selected = await vscode.window.showQuickPick(
    commands.map((command) => ({
      description: getStatusBarCommandScripts(command).join(' + '),
      detail: formatPackagePath(getCommandPackagePath(command)),
      label: command.label,
      command,
    })),
    { placeHolder: 'Run a Script Dock status bar command' },
  );

  if (selected) {
    await runStatusBarCommand(selected.command);
  }
}

export async function createScriptChain() {
  const workspaceFolder = getWorkspaceFolder();

  if (!workspaceFolder) {
    return;
  }

  const scripts = await getVisibleScripts(workspaceFolder);
  const selected = await vscode.window.showQuickPick(
    scripts.map((script) => createScriptQuickPickItem(script)),
    {
      canPickMany: true,
      placeHolder: 'Select package scripts for a status bar chain',
    },
  );

  if (!selected || selected.length === 0) {
    return;
  }

  const packagePaths = new Set(selected.map((item) => item.script.packageRoot.packagePath));

  if (packagePaths.size > 1) {
    vscode.window.showWarningMessage('Script chains must run inside a single package root.');
    return;
  }

  const label = await vscode.window.showInputBox({
    placeHolder: 'verify',
    prompt: 'Name this script chain',
    value: selected.map((item) => item.script.name).join(' + '),
  });

  if (!label) {
    return;
  }

  const executionMode = await pickExecutionMode();

  if (!executionMode) {
    return;
  }

  const [first] = selected;

  if (!first) {
    return;
  }

  await updateStatusBarCommands([
    ...getStatusBarCommands(),
    {
      executionMode,
      icon: executionMode === 'background' ? 'check-all' : 'terminal',
      label,
      packagePath: first.script.packageRoot.packagePath,
      scripts: selected.map((item) => item.script.name),
    },
  ]);
}

export async function addSuggestedChains() {
  const workspaceFolder = getWorkspaceFolder();

  if (!workspaceFolder) {
    return;
  }

  const scripts = await getVisibleScripts(workspaceFolder);
  const suggestions = createChainSuggestions(scripts);

  if (suggestions.length === 0) {
    vscode.window.showInformationMessage('No useful script chains found for this workspace.');
    return;
  }

  const selected = await vscode.window.showQuickPick(
    suggestions.map((suggestion) => ({
      description: formatPackagePath(suggestion.packagePath),
      detail: suggestion.scripts.join(' + '),
      label: suggestion.label,
      suggestion,
    })),
    {
      canPickMany: true,
      placeHolder: 'Add suggested status bar chains',
    },
  );

  if (!selected || selected.length === 0) {
    return;
  }

  await updateStatusBarCommands([
    ...getStatusBarCommands(),
    ...selected.map((item) => ({
      executionMode: 'background' as const,
      icon: 'check-all',
      label: item.suggestion.label,
      packagePath: item.suggestion.packagePath,
      scripts: item.suggestion.scripts,
    })),
  ]);
}

export async function showRunHistory() {
  const history = getRunHistory();

  if (history.length === 0) {
    vscode.window.showInformationMessage('No background run history yet.');
    return;
  }

  const selected = await vscode.window.showQuickPick(
    history.map((entry) => {
      const item = {
        description: `${entry.success ? 'success' : 'failed'}${entry.exitCode === undefined ? '' : ` (${entry.exitCode})`}`,
        label: `${entry.label} - ${new Date(entry.endedAt).toLocaleString()}`,
        entry,
      };

      return entry.outputTail ? { ...item, detail: entry.outputTail } : item;
    }),
    { placeHolder: 'Recent background runs' },
  );

  if (selected) {
    showCommandOutput();
  }
}

export async function resetWorkspacePreferencesCommand() {
  const selected = await vscode.window.showWarningMessage(
    'Reset Script Dock workspace preferences?',
    { modal: true },
    'Reset',
  );

  if (selected !== 'Reset') {
    return;
  }

  await resetWorkspacePreferences();
  vscode.window.showInformationMessage('Script Dock workspace preferences reset.');
}

export async function moveStatusBarCommandsLeft() {
  await updateStatusBarAlignment('left');
  await vscode.commands.executeCommand('setContext', 'scriptDock.statusBarAlignment', 'left');
}

export async function moveStatusBarCommandsRight() {
  await updateStatusBarAlignment('right');
  await vscode.commands.executeCommand('setContext', 'scriptDock.statusBarAlignment', 'right');
}

export async function useCompactStatusBar() {
  await updateStatusBarDisplayMode('compact');
  await vscode.commands.executeCommand('setContext', 'scriptDock.statusBarDisplayMode', 'compact');
}

export async function useExpandedStatusBar() {
  await updateStatusBarDisplayMode('expanded');
  await vscode.commands.executeCommand('setContext', 'scriptDock.statusBarDisplayMode', 'expanded');
}

export async function addStatusBarCommand(item?: ScriptItem) {
  const scriptItem = item ?? (await pickScript());

  if (!scriptItem) {
    return;
  }

  const commands = getStatusBarCommands();

  if (
    commands.some(
      (command) =>
        command.script === scriptItem.scriptName &&
        getCommandPackagePath(command) === scriptItem.packageRoot.packagePath,
    )
  ) {
    vscode.window.showInformationMessage(`${scriptItem.scriptName} is already shown in the status bar.`);
    return;
  }

  await updateStatusBarCommands([
    ...commands,
    {
      executionMode: 'terminal',
      icon: 'terminal',
      label: scriptItem.scriptName,
      packagePath: scriptItem.packageRoot.packagePath,
      script: scriptItem.scriptName,
    },
  ]);
}

export async function removeStatusBarCommand(item?: ScriptItem) {
  const scriptItem = item ?? (await pickScript());

  if (!scriptItem) {
    return;
  }

  const commands = getStatusBarCommands();
  const nextCommands = commands.filter(
    (command) =>
      !(
        command.script === scriptItem.scriptName &&
        getCommandPackagePath(command) === scriptItem.packageRoot.packagePath
      ),
  );

  if (nextCommands.length === commands.length) {
    vscode.window.showInformationMessage(`${scriptItem.scriptName} is not shown in the status bar.`);
    return;
  }

  await updateStatusBarCommands(nextCommands);
}

export async function showHiddenScript() {
  const workspaceFolder = getWorkspaceFolder();

  if (!workspaceFolder) {
    return;
  }

  const hiddenScripts = getConfiguredScripts('hideScripts');

  if (hiddenScripts.length === 0) {
    vscode.window.showInformationMessage('No scripts are hidden.');
    return;
  }

  const allScripts = await getAllScripts(workspaceFolder);
  const hiddenScriptIds = new Set(hiddenScripts);
  const selected = await vscode.window.showQuickPick(
    allScripts.filter((script) => hiddenScriptIds.has(script.id)).map((script) => createScriptQuickPickItem(script)),
    { placeHolder: 'Show hidden package script' },
  );

  if (!selected) {
    return;
  }

  await updateScriptListPreference(
    'hideScripts',
    hiddenScripts.filter((scriptId) => scriptId !== selected.script.id),
  );
}

export async function updateScriptListSetting(
  key: 'autoCloseScripts' | 'favoriteScripts' | 'hideScripts',
  item: ScriptItem | undefined,
  action: 'add' | 'remove',
) {
  const scriptItem = item ?? (await pickScript());

  if (!scriptItem) {
    return;
  }

  const currentValue = getConfiguredScripts(key);
  const currentSet = new Set(currentValue);

  if (action === 'add') {
    currentSet.add(scriptItem.scriptId);
  } else {
    currentSet.delete(scriptItem.scriptId);
  }

  await updateScriptListPreference(key, [...currentSet]);
}

export async function updateStatusBarCommandExecutionMode(
  item: ScriptItem | undefined,
  executionMode: StatusBarCommandExecutionMode,
) {
  const scriptItem = item ?? (await pickScript());

  if (!scriptItem) {
    return;
  }

  const commands = getStatusBarCommands();
  const commandIndex = commands.findIndex((command) => {
    const scriptNames = getStatusBarCommandScripts(command);

    return (
      scriptNames.length === 1 &&
      scriptNames[0] === scriptItem.scriptName &&
      getCommandPackagePath(command) === scriptItem.packageRoot.packagePath
    );
  });

  if (commandIndex === -1) {
    vscode.window.showInformationMessage(`${scriptItem.scriptName} is not shown in the status bar.`);
    return;
  }

  const command = commands[commandIndex];

  if (!command) {
    return;
  }

  const nextCommands = [...commands];
  nextCommands[commandIndex] = {
    ...command,
    executionMode,
  };

  await updateStatusBarCommands(nextCommands);
}

async function pickScript(
  options: { favoritesOnly?: boolean; placeHolder?: string } = {},
): Promise<ScriptItem | undefined> {
  const workspaceFolder = getWorkspaceFolder();

  if (!workspaceFolder) {
    return undefined;
  }

  const visibleScripts = await getVisibleScripts(workspaceFolder);
  const scripts = options.favoritesOnly ? getFavoriteScripts(visibleScripts) : visibleScripts;

  if (scripts.length === 0) {
    vscode.window.showInformationMessage('No package scripts are available for this workspace.');
    return undefined;
  }

  const selected = await vscode.window.showQuickPick(
    scripts.map((script) => createScriptQuickPickItem(script)),
    {
      matchOnDescription: true,
      matchOnDetail: true,
      placeHolder:
        options.placeHolder ??
        (options.favoritesOnly ? 'Run a favorite package script' : 'Select a package script to run'),
    },
  );

  if (!selected) {
    return undefined;
  }

  return new ScriptItem(selected.script, {
    isAutoClose: getConfiguredScripts('autoCloseScripts').includes(selected.script.id),
    isFavorite: getConfiguredScripts('favoriteScripts').includes(selected.script.id),
    isStatusBarCommand: getStatusBarCommands().some(
      (command) =>
        getStatusBarCommandScripts(command).includes(selected.script.name) &&
        getCommandPackagePath(command) === selected.script.packageRoot.packagePath,
    ),
  });
}

async function getPackageRootForCommand(
  workspaceFolder: vscode.WorkspaceFolder,
  command: StatusBarCommand,
): Promise<PackageRoot | undefined> {
  const packageRoots = await getPackageRoots(workspaceFolder);
  const packagePath = getCommandPackagePath(command);
  const packageRoot = packageRoots.find((root) => root.packagePath === packagePath);

  if (!packageRoot) {
    vscode.window.showWarningMessage(`Could not find package root: ${packagePath}`);
    return undefined;
  }

  return packageRoot;
}

async function pickExecutionMode(): Promise<StatusBarCommandExecutionMode | undefined> {
  const selected = await vscode.window.showQuickPick(
    [
      {
        description: 'Runs in Output Channel with spinner/check/error feedback',
        label: 'Background',
        mode: 'background' as const,
      },
      {
        description: 'Opens a VS Code terminal',
        label: 'Terminal',
        mode: 'terminal' as const,
      },
    ],
    { placeHolder: 'Choose how this command should run' },
  );

  return selected?.mode;
}

function createScriptQuickPickItem(script: ScriptEntry) {
  return {
    description:
      script.packageRoot.packagePath === '.' ? script.command : `${script.packageRoot.packagePath} - ${script.command}`,
    detail: script.packageRoot.label,
    label: script.name,
    script,
  };
}

function createChainSuggestions(
  scripts: ScriptEntry[],
): Array<{ label: string; packagePath: string; scripts: string[] }> {
  const existingKeys = new Set(
    getStatusBarCommands().map((command) =>
      createChainKey(getCommandPackagePath(command), getStatusBarCommandScripts(command)),
    ),
  );
  const scriptsByPackage = new Map<string, Set<string>>();
  const suggestions: Array<{ label: string; packagePath: string; scripts: string[] }> = [];
  const candidates = [
    { label: 'verify', scripts: ['format', 'knip', 'build'] },
    { label: 'quality', scripts: ['format', 'lint', 'build'] },
    { label: 'ci', scripts: ['lint', 'test', 'build'] },
    { label: 'check', scripts: ['typecheck', 'lint', 'test'] },
    { label: 'test + build', scripts: ['test', 'build'] },
    { label: 'format + lint', scripts: ['format', 'lint'] },
    { label: 'lint + build', scripts: ['lint', 'build'] },
  ];

  for (const script of scripts) {
    const packageScripts = scriptsByPackage.get(script.packageRoot.packagePath) ?? new Set<string>();
    packageScripts.add(script.name);
    scriptsByPackage.set(script.packageRoot.packagePath, packageScripts);
  }

  for (const [packagePath, packageScripts] of scriptsByPackage) {
    for (const candidate of candidates) {
      if (!candidate.scripts.every((scriptName) => packageScripts.has(scriptName))) {
        continue;
      }

      const key = createChainKey(packagePath, candidate.scripts);

      if (existingKeys.has(key)) {
        continue;
      }

      suggestions.push({
        label: candidate.label,
        packagePath,
        scripts: candidate.scripts,
      });
      existingKeys.add(key);
    }
  }

  return suggestions;
}

function createChainKey(packagePath: string, scriptNames: string[]): string {
  return `${packagePath}:${scriptNames.join('&&')}`;
}

function createFailureMessage(
  label: string,
  exitCode: number | null | undefined,
  outputTail: string | undefined,
): string {
  const status = `${label} failed${exitCode === undefined ? '' : ` (exit code ${exitCode})`}.`;
  const lastLine = outputTail?.split('\n').filter(Boolean).at(-1);

  return lastLine ? `${status} ${lastLine}` : status;
}

function getCommandPackagePath(command: StatusBarCommand): string {
  return command.packagePath ?? '.';
}

function formatPackagePath(packagePath: string): string {
  return packagePath === '.' ? 'Workspace root' : packagePath;
}

function getWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

  if (!workspaceFolder) {
    vscode.window.showWarningMessage('Open a workspace folder before running package scripts.');
    return undefined;
  }

  return workspaceFolder;
}
