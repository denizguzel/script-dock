export type ExecutionMode = 'background' | 'terminal';
export type RunState = 'cancelled' | 'failed' | 'idle' | 'running' | 'success';
export type ScriptFilter = 'all' | 'favorites' | 'hidden' | 'pinned' | 'runnable';
export type StatusBarAlignment = 'left' | 'right';
export type StatusBarDisplayMode = 'compact' | 'expanded';

interface RunStatus {
  exitCode?: number | null;
  message?: string;
  state: RunState;
}

export interface ScriptViewModel {
  autoClose: boolean;
  command: string;
  executionMode: ExecutionMode | null;
  id: string;
  isFavorite: boolean;
  isHidden: boolean;
  isPinned: boolean;
  name: string;
  packageLabel: string;
  packagePath: string;
  runStatus: RunStatus;
}

export interface PinnedScriptViewModel {
  executionMode: ExecutionMode;
  key: string;
  label: string;
  missingScripts: string[];
  packagePath: string;
  runStatus: RunStatus;
  scripts: string[];
}

export interface LauncherState {
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
    alignment: StatusBarAlignment;
    displayMode: StatusBarDisplayMode;
    visible: boolean;
  };
  workspaceName: string | null;
}

export type VsCodeApi = {
  postMessage(message: unknown): void;
};
