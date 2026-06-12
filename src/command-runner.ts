import { spawn } from 'node:child_process';
import * as vscode from 'vscode';
import type { ResolvedPackageManager, StatusBarCommand, StatusBarCommandRunStatus } from './types';
import { createStatusBarCommandKey } from './status-bar-command';

interface BackgroundRunOptions {
  command: StatusBarCommand;
  cwd: string;
  packageManager: ResolvedPackageManager;
  scriptNames: string[];
}

interface BackgroundRunResult {
  exitCode?: number | null;
  message?: string;
  success: boolean;
}

const outputChannel = vscode.window.createOutputChannel('Script Dock');
const runStates = new Map<string, StatusBarCommandRunStatus>();
const onDidChangeStatusBarCommandRunStateEmitter = new vscode.EventEmitter<void>();

export const onDidChangeStatusBarCommandRunState = onDidChangeStatusBarCommandRunStateEmitter.event;

export function getStatusBarCommandRunStatus(command: StatusBarCommand): StatusBarCommandRunStatus {
  return runStates.get(createStatusBarCommandKey(command)) ?? { state: 'idle' };
}

export async function runStatusBarCommandInBackground(options: BackgroundRunOptions): Promise<BackgroundRunResult> {
  const commandKey = createStatusBarCommandKey(options.command);

  setRunState(commandKey, { state: 'running' });
  appendRunHeader(options);

  for (const scriptName of options.scriptNames) {
    const result = await runScript(options.packageManager, scriptName, options.cwd);

    if (!result.success) {
      const message = `${options.command.label} failed while running "${scriptName}".`;

      outputChannel.appendLine('');
      outputChannel.appendLine(`[failed] ${message}`);
      setRunState(commandKey, createFailureStatus(message, result.exitCode));

      return createFailureResult(message, result.exitCode);
    }
  }

  outputChannel.appendLine('');
  outputChannel.appendLine(`[success] ${options.command.label}`);
  setRunState(commandKey, { state: 'success' });
  clearTransientSuccess(commandKey);

  return { success: true };
}

export function showCommandOutput() {
  outputChannel.show(true);
}

export function disposeCommandRunner() {
  outputChannel.dispose();
  onDidChangeStatusBarCommandRunStateEmitter.dispose();
}

function appendRunHeader(options: BackgroundRunOptions) {
  outputChannel.appendLine('');
  outputChannel.appendLine(`> ${options.command.label}`);
  outputChannel.appendLine(`cwd: ${options.cwd}`);
  outputChannel.appendLine(`scripts: ${options.scriptNames.join(' && ')}`);
}

async function runScript(
  packageManager: ResolvedPackageManager,
  scriptName: string,
  cwd: string,
): Promise<BackgroundRunResult> {
  const [command, args] = createSpawnCommand(packageManager, scriptName);

  outputChannel.appendLine('');
  outputChannel.appendLine(`$ ${command} ${args.join(' ')}`);

  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      shell: false,
    });

    child.stdout.on('data', (chunk: Buffer) => {
      outputChannel.append(chunk.toString());
    });

    child.stderr.on('data', (chunk: Buffer) => {
      outputChannel.append(chunk.toString());
    });

    child.on('error', (error) => {
      outputChannel.appendLine('');
      outputChannel.appendLine(`[error] ${error.message}`);
      resolve({
        message: error.message,
        success: false,
      });
    });

    child.on('close', (exitCode) => {
      resolve({
        exitCode,
        success: exitCode === 0,
      });
    });
  });
}

function createSpawnCommand(packageManager: ResolvedPackageManager, scriptName: string): [string, string[]] {
  return [packageManager, ['run', scriptName]];
}

function setRunState(commandKey: string, status: StatusBarCommandRunStatus) {
  runStates.set(commandKey, status);
  onDidChangeStatusBarCommandRunStateEmitter.fire();
}

function clearTransientSuccess(commandKey: string) {
  setTimeout(() => {
    if (runStates.get(commandKey)?.state !== 'success') {
      return;
    }

    runStates.delete(commandKey);
    onDidChangeStatusBarCommandRunStateEmitter.fire();
  }, 1500);
}

function createFailureStatus(message: string, exitCode: number | null | undefined): StatusBarCommandRunStatus {
  if (exitCode === undefined) {
    return {
      message,
      state: 'failed',
    };
  }

  return {
    exitCode,
    message,
    state: 'failed',
  };
}

function createFailureResult(message: string, exitCode: number | null | undefined): BackgroundRunResult {
  if (exitCode === undefined) {
    return {
      message,
      success: false,
    };
  }

  return {
    exitCode,
    message,
    success: false,
  };
}
