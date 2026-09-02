export interface PackageJson {
  name?: string;
  scripts?: Record<string, string>;
}

export type PackageManager = 'auto' | 'bun' | 'npm' | 'pnpm' | 'yarn';
export type ResolvedPackageManager = Exclude<PackageManager, 'auto'>;
export type ScriptFilter = 'all' | 'hidden' | 'pinned' | 'runnable';
export type StatusBarAlignmentPreference = 'left' | 'right';
export type StatusBarCommandExecutionMode = 'background' | 'terminal';
export type StatusBarDisplayMode = 'compact' | 'expanded';
export type StatusBarCommandRunState = 'cancelled' | 'failed' | 'idle' | 'running' | 'success';

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
  hideScripts: string[];
  showStatusBarScripts: boolean;
  statusBarAlignment: StatusBarAlignmentPreference;
  statusBarCommands: StatusBarCommand[];
  statusBarDisplayMode: StatusBarDisplayMode;
}

export interface ScriptViewModel {
  autoClose: boolean;
  command: string;
  executionMode: StatusBarCommandExecutionMode | null;
  id: string;
  isHidden: boolean;
  isPinned: boolean;
  name: string;
  packageLabel: string;
  packagePath: string;
  runStatus: StatusBarCommandRunStatus;
}

export interface PinnedScriptViewModel {
  executionMode: StatusBarCommandExecutionMode;
  key: string;
  label: string;
  missingScripts: string[];
  packagePath: string;
  runStatus: StatusBarCommandRunStatus;
  scripts: string[];
}

export interface ScriptDockState {
  allScripts: ScriptViewModel[];
  empty: {
    kind: 'allHidden' | 'none' | 'noPackageJson' | 'noScripts' | 'noWorkspace';
    message: string;
  };
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
