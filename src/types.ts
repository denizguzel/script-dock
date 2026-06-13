export interface PackageJson {
  name?: string;
  scripts?: Record<string, string>;
}

export type PackageManager = 'auto' | 'bun' | 'npm' | 'pnpm' | 'yarn';
export type ResolvedPackageManager = Exclude<PackageManager, 'auto'>;
export type StatusBarAlignmentPreference = 'left' | 'right';
export type StatusBarCommandExecutionMode = 'background' | 'terminal';
export type StatusBarDisplayMode = 'compact' | 'expanded';
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

export interface WorkspacePreferences {
  autoCloseScripts: string[];
  collapsedTreeGroups: string[];
  favoriteScripts: string[];
  hideScripts: string[];
  statusBarAlignment: StatusBarAlignmentPreference;
  statusBarCommands: StatusBarCommand[];
  statusBarDisplayMode: StatusBarDisplayMode;
}
