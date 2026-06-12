export interface PackageJson {
  name?: string;
  scripts?: Record<string, string>;
}

export type PackageManager = 'auto' | 'bun' | 'npm' | 'pnpm' | 'yarn';
export type ResolvedPackageManager = Exclude<PackageManager, 'auto'>;
export type StatusBarAlignmentPreference = 'left' | 'right';
export type StatusBarCommandExecutionMode = 'background' | 'terminal';
type StatusBarCommandRunState = 'failed' | 'idle' | 'running' | 'success';

export interface PackageRoot {
  fsPath: string;
  label: string;
  packagePath: string;
}

export interface ScriptEntry {
  name: string;
  command: string;
  id: string;
  packageRoot: PackageRoot;
}

export interface StatusBarCommand {
  label: string;
  script?: string;
  scripts?: string[];
  packagePath?: string;
  icon?: string;
  autoClose?: boolean;
  executionMode?: StatusBarCommandExecutionMode;
}

export interface StatusBarCommandRunStatus {
  exitCode?: number | null;
  message?: string;
  state: StatusBarCommandRunState;
}

export interface ScriptRunHistory {
  commandKey: string;
  durationMs?: number;
  endedAt: number;
  exitCode?: number | null;
  label: string;
  message?: string;
  outputTail?: string;
  packagePath?: string;
  scriptNames: string[];
  success: boolean;
}

export interface WorkspacePreferences {
  autoCloseScripts: string[];
  favoriteScripts: string[];
  hideScripts: string[];
  runHistory: ScriptRunHistory[];
  statusBarAlignment: StatusBarAlignmentPreference;
  statusBarCommands: StatusBarCommand[];
}
