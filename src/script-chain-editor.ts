import * as vscode from 'vscode';
import type { ScriptEntry, StatusBarCommandExecutionMode } from './types';
import { createWebviewHtml } from './webview-html';

export interface ScriptChainEditorResult {
  executionMode: StatusBarCommandExecutionMode;
  label: string;
  scriptNames: string[];
}

interface ScriptChainEditorState {
  command: {
    executionMode: StatusBarCommandExecutionMode;
    label: string;
    scriptNames: string[];
  };
  scripts: Array<{
    command: string;
    name: string;
  }>;
  title: string;
}

export function showScriptChainEditor(options: {
  extensionUri: vscode.Uri;
  initialChain: {
    executionMode: StatusBarCommandExecutionMode;
    label: string;
    scriptNames: string[];
  };
  packageScripts: ScriptEntry[];
  title: string;
}): Promise<ScriptChainEditorResult | undefined> {
  const panel = vscode.window.createWebviewPanel('scriptDock.chainEditor', options.title, vscode.ViewColumn.Active, {
    enableScripts: true,
    localResourceRoots: [vscode.Uri.joinPath(options.extensionUri, 'dist', 'webviews')],
  });
  let settled = false;

  panel.webview.html = createScriptChainEditorHtml({
    extensionUri: options.extensionUri,
    state: createScriptChainEditorState(options.initialChain, options.packageScripts, options.title),
    webview: panel.webview,
  });

  return new Promise((resolve) => {
    panel.onDidDispose(() => {
      if (!settled) {
        settled = true;
        resolve(undefined);
      }
    });

    panel.webview.onDidReceiveMessage((message: unknown) => {
      if (isCancelMessage(message)) {
        settled = true;
        resolve(undefined);
        panel.dispose();
        return;
      }

      const result = parseSaveMessage(message, options.packageScripts);

      if (!result) {
        vscode.window.showErrorMessage('Choose at least one valid script before saving this chain.');
        return;
      }

      settled = true;
      resolve(result);
      panel.dispose();
    });
  });
}

function createScriptChainEditorState(
  initialChain: {
    executionMode: StatusBarCommandExecutionMode;
    label: string;
    scriptNames: string[];
  },
  packageScripts: ScriptEntry[],
  title: string,
): ScriptChainEditorState {
  return {
    command: {
      executionMode: initialChain.executionMode,
      label: initialChain.label,
      scriptNames: initialChain.scriptNames,
    },
    scripts: packageScripts.map((script) => ({
      command: script.command,
      name: script.name,
    })),
    title,
  };
}

function createScriptChainEditorHtml(options: {
  extensionUri: vscode.Uri;
  state: ScriptChainEditorState;
  webview: vscode.Webview;
}): string {
  return createWebviewHtml({
    extensionUri: options.extensionUri,
    scriptFileName: 'script-chain-editor.js',
    state: options.state,
    stateGlobalName: '__SCRIPT_DOCK_CHAIN_EDITOR_STATE__',
    title: 'Edit Script Chain',
    webview: options.webview,
  });
}

function parseSaveMessage(message: unknown, packageScripts: ScriptEntry[]): ScriptChainEditorResult | undefined {
  if (!isObject(message) || message['type'] !== 'save') {
    return undefined;
  }

  const label = typeof message['label'] === 'string' ? message['label'].trim() : '';
  const executionMode = message['executionMode'];
  const scriptNames = message['scriptNames'];
  const availableScriptNames = new Set(packageScripts.map((script) => script.name));

  if (
    label === '' ||
    (executionMode !== 'background' && executionMode !== 'terminal') ||
    !Array.isArray(scriptNames) ||
    scriptNames.length === 0 ||
    !scriptNames.every((scriptName) => typeof scriptName === 'string' && availableScriptNames.has(scriptName))
  ) {
    return undefined;
  }

  return {
    executionMode,
    label,
    scriptNames,
  };
}

function isCancelMessage(message: unknown): boolean {
  return isObject(message) && message['type'] === 'cancel';
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
