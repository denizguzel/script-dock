import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import * as vscode from 'vscode';
import { updateRunHistory } from './config';
import type { ResolvedPackageManager, ScriptRunHistory, StatusBarCommand, StatusBarCommandRunStatus } from './types';
import { createStatusBarCommandKey } from './status-bar-command';

interface BackgroundRunOptions {
  command: StatusBarCommand;
  cwd: string;
  packageManager: ResolvedPackageManager;
  packagePath?: string;
  scriptNames: string[];
}

interface BackgroundRunResult {
  durationMs?: number;
  exitCode?: number | null;
  message?: string;
  outputTail?: string;
  success: boolean;
}

const outputChannel = vscode.window.createOutputChannel('Script Dock');
const runStates = new Map<string, StatusBarCommandRunStatus>();
const runningProcesses = new Map<string, ChildProcessWithoutNullStreams>();
const onDidChangeStatusBarCommandRunStateEmitter = new vscode.EventEmitter<void>();

export const onDidChangeStatusBarCommandRunState = onDidChangeStatusBarCommandRunStateEmitter.event;

export function getStatusBarCommandRunStatus(command: StatusBarCommand): StatusBarCommandRunStatus {
  return runStates.get(createStatusBarCommandKey(command)) ?? { state: 'idle' };
}

export function clearStatusBarCommandRunStatus(command: StatusBarCommand) {
  const commandKey = createStatusBarCommandKey(command);

  if (!runStates.delete(commandKey)) {
    return;
  }

  onDidChangeStatusBarCommandRunStateEmitter.fire();
}

export async function runStatusBarCommandInBackground(options: BackgroundRunOptions): Promise<BackgroundRunResult> {
  const commandKey = createStatusBarCommandKey(options.command);
  const startedAt = Date.now();
  const outputBuffer = new OutputTailBuffer();

  setRunState(commandKey, { state: 'running' });
  appendRunHeader(options);

  for (const scriptName of options.scriptNames) {
    const result = await runScript(options.packageManager, scriptName, options.cwd, commandKey, outputBuffer);

    if (!result.success) {
      const message = `${options.command.label} failed while running "${scriptName}".`;
      const durationMs = Date.now() - startedAt;

      outputChannel.appendLine('');
      outputChannel.appendLine(`[failed] ${message}`);
      setRunState(commandKey, createFailureStatus(message, result.exitCode));
      void updateRunHistory(
        createRunHistoryEntry(
          options,
          commandKey,
          createRunResult({
            durationMs,
            exitCode: result.exitCode,
            message,
            outputTail: outputBuffer.value,
            success: false,
          }),
        ),
      );

      return createFailureResult(message, result.exitCode, durationMs, outputBuffer.value);
    }
  }

  const durationMs = Date.now() - startedAt;

  outputChannel.appendLine('');
  outputChannel.appendLine(`[success] ${options.command.label}`);
  setRunState(commandKey, { state: 'success' });
  void updateRunHistory(
    createRunHistoryEntry(options, commandKey, {
      durationMs,
      outputTail: outputBuffer.value,
      success: true,
    }),
  );
  clearTransientSuccess(commandKey);

  return {
    durationMs,
    outputTail: outputBuffer.value,
    success: true,
  };
}

export function showCommandOutput() {
  outputChannel.show(true);
}

export function stopStatusBarCommand(command: StatusBarCommand): boolean {
  const commandKey = createStatusBarCommandKey(command);
  const child = runningProcesses.get(commandKey);

  if (!child) {
    return false;
  }

  child.kill();
  runningProcesses.delete(commandKey);
  setRunState(commandKey, {
    message: 'Stopped by user.',
    state: 'failed',
  });
  outputChannel.appendLine('');
  outputChannel.appendLine(`[stopped] ${command.label}`);

  return true;
}

export function disposeCommandRunner() {
  for (const child of runningProcesses.values()) {
    child.kill();
  }

  runningProcesses.clear();
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
  commandKey: string,
  outputBuffer: OutputTailBuffer,
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

    runningProcesses.set(commandKey, child);

    child.stdout.on('data', (chunk: Buffer) => {
      const output = chunk.toString();
      outputBuffer.append(output);
      outputChannel.append(output);
    });

    child.stderr.on('data', (chunk: Buffer) => {
      const output = chunk.toString();
      outputBuffer.append(output);
      outputChannel.append(output);
    });

    child.on('error', (error) => {
      outputChannel.appendLine('');
      outputChannel.appendLine(`[error] ${error.message}`);
      runningProcesses.delete(commandKey);
      resolve({
        message: error.message,
        outputTail: outputBuffer.value,
        success: false,
      });
    });

    child.on('close', (exitCode) => {
      runningProcesses.delete(commandKey);
      resolve({
        exitCode,
        outputTail: outputBuffer.value,
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

function createFailureResult(
  message: string,
  exitCode: number | null | undefined,
  durationMs: number,
  outputTail: string,
): BackgroundRunResult {
  if (exitCode === undefined) {
    return {
      durationMs,
      message,
      outputTail,
      success: false,
    };
  }

  return {
    durationMs,
    exitCode,
    message,
    outputTail,
    success: false,
  };
}

function createRunResult(result: {
  durationMs: number;
  exitCode: number | null | undefined;
  message: string | undefined;
  outputTail: string;
  success: boolean;
}) {
  return {
    durationMs: result.durationMs,
    outputTail: result.outputTail,
    success: result.success,
    ...(result.exitCode === undefined ? {} : { exitCode: result.exitCode }),
    ...(result.message === undefined ? {} : { message: result.message }),
  };
}

function createRunHistoryEntry(
  options: BackgroundRunOptions,
  commandKey: string,
  result: {
    durationMs: number;
    exitCode?: number | null;
    message?: string;
    outputTail: string;
    success: boolean;
  },
): ScriptRunHistory {
  const base = {
    commandKey,
    durationMs: result.durationMs,
    endedAt: Date.now(),
    label: options.command.label,
    outputTail: result.outputTail,
    scriptNames: options.scriptNames,
    success: result.success,
  };

  return {
    ...base,
    ...(result.exitCode === undefined ? {} : { exitCode: result.exitCode }),
    ...(result.message === undefined ? {} : { message: result.message }),
    ...(options.packagePath === undefined ? {} : { packagePath: options.packagePath }),
  };
}

class OutputTailBuffer {
  private chunks = '';

  get value(): string {
    return this.chunks.trim().split('\n').slice(-20).join('\n');
  }

  append(value: string) {
    this.chunks = `${this.chunks}${value}`.slice(-8000);
  }
}
