export type ExecutionMode = 'background' | 'terminal';

export interface ScriptOption {
  command: string;
  name: string;
}

export interface ChainEditorState {
  command: {
    executionMode: ExecutionMode;
    label: string;
    scriptNames: string[];
  };
  scripts: ScriptOption[];
  title: string;
}

export type VsCodeApi = {
  postMessage(message: unknown): void;
};
