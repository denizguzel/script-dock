import * as vscode from 'vscode';
import { getStatusBarCommandRunStatus, runStatusBarCommandInBackground, showCommandOutput } from './command-runner';
import {
  getConfiguredScripts,
  getStatusBarCommands,
  updateStatusBarAlignment,
  updateScriptListPreference,
  updateStatusBarCommands,
} from './config';
import { resolvePackageManager } from './package-manager';
import { getAllScripts, getFavoriteScripts, getVisibleScripts } from './scripts';
import { getStatusBarCommandScripts, getStatusBarExecutionMode } from './status-bar-command';
import { createTerminalCommand, runTerminalCommand } from './terminal';
import { ScriptItem } from './tree';
import type { StatusBarCommand, StatusBarCommandExecutionMode } from './types';

export async function runScript(item?: ScriptItem) {
  const scriptItem = item ?? (await pickScript());

  if (!scriptItem) {
    return;
  }

  const packageManager = await resolvePackageManager(scriptItem.workspaceFolder.uri.fsPath);
  const command = createTerminalCommand(packageManager, [scriptItem.scriptName]);

  runTerminalCommand({
    command,
    cwd: scriptItem.workspaceFolder.uri.fsPath,
    name: `${packageManager} ${scriptItem.scriptName}`,
  });
}

export async function runStatusBarCommand(command: StatusBarCommand, options: { forceRun?: boolean } = {}) {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

  if (!workspaceFolder) {
    vscode.window.showWarningMessage('Open a workspace folder before running package scripts.');
    return;
  }

  const scriptNames = getStatusBarCommandScripts(command);

  if (scriptNames.length === 0) {
    vscode.window.showWarningMessage(`Status bar command "${command.label}" has no scripts configured.`);
    return;
  }

  const availableScripts = await getAllScripts(workspaceFolder);
  const missingScripts = scriptNames.filter(
    (scriptName) => !availableScripts.some((script) => script.name === scriptName),
  );

  if (missingScripts.length > 0) {
    vscode.window.showWarningMessage(
      `Missing package script${missingScripts.length > 1 ? 's' : ''}: ${missingScripts.join(', ')}`,
    );
    return;
  }

  const runStatus = getStatusBarCommandRunStatus(command);

  if (!options.forceRun && runStatus.state === 'running') {
    showCommandOutput();
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

  const packageManager = await resolvePackageManager(workspaceFolder.uri.fsPath);

  if (getStatusBarExecutionMode(command) === 'background') {
    const result = await runStatusBarCommandInBackground({
      command,
      cwd: workspaceFolder.uri.fsPath,
      packageManager,
      scriptNames,
    });

    if (!result.success) {
      const selected = await vscode.window.showErrorMessage(
        `${command.label} failed${result.exitCode === undefined ? '' : ` (exit code ${result.exitCode})`}.`,
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

  const terminalCommand = createTerminalCommand(packageManager, scriptNames, command.autoClose);

  runTerminalCommand({
    command: terminalCommand,
    cwd: workspaceFolder.uri.fsPath,
    name: `${packageManager} ${command.label}`,
  });
}

export async function pickAndRunFavoriteScript() {
  const scriptItem = await pickScript({ favoritesOnly: true });

  if (scriptItem) {
    await runScript(scriptItem);
  }
}

export async function moveStatusBarCommandsLeft() {
  await updateStatusBarAlignment('left');
  await vscode.commands.executeCommand('setContext', 'scriptDock.statusBarAlignment', 'left');
}

export async function moveStatusBarCommandsRight() {
  await updateStatusBarAlignment('right');
  await vscode.commands.executeCommand('setContext', 'scriptDock.statusBarAlignment', 'right');
}

export async function addStatusBarCommand(item?: ScriptItem) {
  const scriptItem = item ?? (await pickScript());

  if (!scriptItem) {
    return;
  }

  const commands = getStatusBarCommands();

  if (commands.some((command) => command.script === scriptItem.scriptName)) {
    vscode.window.showInformationMessage(`${scriptItem.scriptName} is already shown in the status bar.`);
    return;
  }

  await updateStatusBarCommands([
    ...commands,
    {
      label: scriptItem.scriptName,
      script: scriptItem.scriptName,
      icon: 'terminal',
      executionMode: 'terminal',
    },
  ]);
}

export async function removeStatusBarCommand(item?: ScriptItem) {
  const scriptItem = item ?? (await pickScript());

  if (!scriptItem) {
    return;
  }

  const commands = getStatusBarCommands();
  const nextCommands = commands.filter((command) => command.script !== scriptItem.scriptName);

  if (nextCommands.length === commands.length) {
    vscode.window.showInformationMessage(`${scriptItem.scriptName} is not shown in the status bar.`);
    return;
  }

  await updateStatusBarCommands(nextCommands);
}

export async function showHiddenScript() {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

  if (!workspaceFolder) {
    vscode.window.showWarningMessage('Open a workspace folder before changing hidden scripts.');
    return;
  }

  const hiddenScripts = getConfiguredScripts('hideScripts');

  if (hiddenScripts.length === 0) {
    vscode.window.showInformationMessage('No scripts are hidden.');
    return;
  }

  const allScripts = await getAllScripts(workspaceFolder);
  const hiddenScriptNames = new Set(hiddenScripts);
  const selected = await vscode.window.showQuickPick(
    allScripts
      .filter((script) => hiddenScriptNames.has(script.name))
      .map((script) => ({
        label: script.name,
        description: script.command,
        script,
      })),
    { placeHolder: 'Show hidden package script' },
  );

  if (!selected) {
    return;
  }

  await updateScriptListPreference(
    'hideScripts',
    hiddenScripts.filter((scriptName) => scriptName !== selected.script.name),
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
    currentSet.add(scriptItem.scriptName);
  } else {
    currentSet.delete(scriptItem.scriptName);
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

    return scriptNames.length === 1 && scriptNames[0] === scriptItem.scriptName;
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

async function pickScript(options: { favoritesOnly?: boolean } = {}): Promise<ScriptItem | undefined> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

  if (!workspaceFolder) {
    vscode.window.showWarningMessage('Open a workspace folder before running package scripts.');
    return undefined;
  }

  const visibleScripts = await getVisibleScripts(workspaceFolder);
  const scripts = options.favoritesOnly ? getFavoriteScripts(visibleScripts) : visibleScripts;

  if (scripts.length === 0) {
    vscode.window.showInformationMessage('No package scripts are available for this workspace.');
    return undefined;
  }

  const selected = await vscode.window.showQuickPick(
    scripts.map((script) => ({
      label: script.name,
      description: script.command,
      script,
    })),
    { placeHolder: options.favoritesOnly ? 'Run a favorite package script' : 'Select a package script to run' },
  );

  if (!selected) {
    return undefined;
  }

  return new ScriptItem(selected.script.name, selected.script.command, workspaceFolder, {
    isAutoClose: getConfiguredScripts('autoCloseScripts').includes(selected.script.name),
    isFavorite: getConfiguredScripts('favoriteScripts').includes(selected.script.name),
    isStatusBarCommand: getStatusBarCommands().some((command) =>
      getStatusBarCommandScripts(command).includes(selected.script.name),
    ),
  });
}
