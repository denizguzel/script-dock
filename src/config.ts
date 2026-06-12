import * as vscode from 'vscode';
import type {
  PackageManager,
  ScriptRunHistory,
  StatusBarAlignmentPreference,
  StatusBarCommand,
  WorkspacePreferences,
} from './types';

export const configurationSection = 'scriptDock';

type ScriptListPreferenceKey = 'autoCloseScripts' | 'favoriteScripts' | 'hideScripts';
type PreferenceKey = keyof WorkspacePreferences;

let workspaceState: vscode.Memento | undefined;
const onDidChangeWorkspacePreferencesEmitter = new vscode.EventEmitter<void>();

export const onDidChangeWorkspacePreferences = onDidChangeWorkspacePreferencesEmitter.event;

export function initializeWorkspacePreferences(state: vscode.Memento) {
  workspaceState = state;
}

export function getConfiguredScripts(key: 'autoCloseScripts' | 'favoriteScripts' | 'hideScripts'): string[] {
  return getWorkspacePreference(key) ?? vscode.workspace.getConfiguration(configurationSection).get<string[]>(key, []);
}

export function getStatusBarCommands(): StatusBarCommand[] {
  return (
    getWorkspacePreference('statusBarCommands') ??
    vscode.workspace.getConfiguration(configurationSection).get<StatusBarCommand[]>('statusBarCommands', [])
  );
}

export function getRunHistory(): ScriptRunHistory[] {
  return getWorkspacePreference('runHistory') ?? [];
}

export function getConfiguredPackageManager(): PackageManager {
  return vscode.workspace.getConfiguration(configurationSection).get<PackageManager>('packageManager', 'auto');
}

export function getStatusBarAlignment(): vscode.StatusBarAlignment {
  const alignment =
    getWorkspacePreference('statusBarAlignment') ??
    vscode.workspace
      .getConfiguration(configurationSection)
      .get<StatusBarAlignmentPreference>('statusBarAlignment', 'left');

  return alignment === 'right' ? vscode.StatusBarAlignment.Right : vscode.StatusBarAlignment.Left;
}

export function getStatusBarAlignmentPreference(): StatusBarAlignmentPreference {
  return getStatusBarAlignment() === vscode.StatusBarAlignment.Right ? 'right' : 'left';
}

export function getStatusBarPriority(): number {
  return vscode.workspace.getConfiguration(configurationSection).get<number>('statusBarPriority', 10000);
}

export function getStatusBarPriorityStep(): number {
  return vscode.workspace.getConfiguration(configurationSection).get<number>('statusBarPriorityStep', 10);
}

export async function updateScriptListPreference(key: ScriptListPreferenceKey, value: string[]) {
  await updateWorkspacePreference(key, value);
}

export async function updateStatusBarCommands(value: StatusBarCommand[]) {
  await updateWorkspacePreference('statusBarCommands', value);
}

export async function updateStatusBarAlignment(value: StatusBarAlignmentPreference) {
  await updateWorkspacePreference('statusBarAlignment', value);
}

export async function updateRunHistory(entry: ScriptRunHistory) {
  const history = getRunHistory().filter((item) => item.commandKey !== entry.commandKey);

  await updateWorkspacePreference('runHistory', [entry, ...history].slice(0, 50));
}

export async function resetWorkspacePreferences() {
  const preferenceKeys: PreferenceKey[] = [
    'autoCloseScripts',
    'favoriteScripts',
    'hideScripts',
    'runHistory',
    'statusBarAlignment',
    'statusBarCommands',
  ];

  await Promise.all(preferenceKeys.map((key) => workspaceState?.update(createWorkspacePreferenceKey(key), undefined)));
  onDidChangeWorkspacePreferencesEmitter.fire();
}

function getWorkspacePreference<Key extends PreferenceKey>(key: Key): WorkspacePreferences[Key] | undefined {
  return workspaceState?.get<WorkspacePreferences[Key]>(createWorkspacePreferenceKey(key));
}

async function updateWorkspacePreference<Key extends PreferenceKey>(key: Key, value: WorkspacePreferences[Key]) {
  await workspaceState?.update(createWorkspacePreferenceKey(key), value);
  onDidChangeWorkspacePreferencesEmitter.fire();
}

function createWorkspacePreferenceKey(key: PreferenceKey): string {
  return `${configurationSection}.${key}`;
}
