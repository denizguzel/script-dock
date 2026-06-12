export interface PackageJson {
  scripts?: Record<string, string>;
}

export type PackageManager = 'auto' | 'bun' | 'npm' | 'pnpm' | 'yarn';
export type ResolvedPackageManager = Exclude<PackageManager, 'auto'>;
export type StatusBarAlignmentPreference = 'left' | 'right';
export type StatusBarCommandExecutionMode = 'background' | 'terminal';
type StatusBarCommandRunState = 'failed' | 'idle' | 'running' | 'success';

export interface ScriptEntry {
  name: string;
  command: string;
}

export interface StatusBarCommand {
  label: string;
  script?: string;
  scripts?: string[];
  icon?: string;
  autoClose?: boolean;
  executionMode?: StatusBarCommandExecutionMode;
}

export interface StatusBarCommandRunStatus {
  exitCode?: number | null;
  message?: string;
  state: StatusBarCommandRunState;
}

export interface WorkspacePreferences {
  autoCloseScripts: string[];
  favoriteScripts: string[];
  hideScripts: string[];
  statusBarAlignment: StatusBarAlignmentPreference;
  statusBarCommands: StatusBarCommand[];
}
