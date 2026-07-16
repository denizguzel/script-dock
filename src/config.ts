import * as vscode from 'vscode';
import type {
  PackageManager,
  StatusBarAlignmentPreference,
  StatusBarCommand,
  StatusBarDisplayMode,
  WorkspacePreferences,
} from './types';

export const configurationSection = 'scriptDock';

type ScriptListPreferenceKey = 'autoCloseScripts' | 'hideScripts';
type PreferenceKey = keyof WorkspacePreferences;

let workspaceState: vscode.Memento | undefined;
const onDidChangeWorkspacePreferencesEmitter = new vscode.EventEmitter<void>();

export const onDidChangeWorkspacePreferences = onDidChangeWorkspacePreferencesEmitter.event;

export function initializeWorkspacePreferences(state: vscode.Memento) {
  workspaceState = state;
}

export function getConfiguredScripts(key: ScriptListPreferenceKey): string[] {
  return getWorkspacePreference(key) ?? vscode.workspace.getConfiguration(configurationSection).get<string[]>(key, []);
}

export function getStatusBarCommands(): StatusBarCommand[] {
  return (
    getWorkspacePreference('statusBarCommands') ??
    vscode.workspace.getConfiguration(configurationSection).get<StatusBarCommand[]>('statusBarCommands', [])
  );
}

export function getConfiguredPackageManager(): PackageManager {
  return vscode.workspace.getConfiguration(configurationSection).get<PackageManager>('packageManager', 'auto');
}

export function getStatusBarAlignment(): vscode.StatusBarAlignment {
  const alignment =
    getWorkspacePreference('statusBarAlignment') ??
    vscode.workspace
      .getConfiguration(configurationSection)
      .get<StatusBarAlignmentPreference>('statusBarAlignment', 'right');

  return alignment === 'right' ? vscode.StatusBarAlignment.Right : vscode.StatusBarAlignment.Left;
}

export function getStatusBarAlignmentPreference(): StatusBarAlignmentPreference {
  return getStatusBarAlignment() === vscode.StatusBarAlignment.Right ? 'right' : 'left';
}

export function getStatusBarDisplayMode(): StatusBarDisplayMode {
  return (
    getWorkspacePreference('statusBarDisplayMode') ??
    vscode.workspace
      .getConfiguration(configurationSection)
      .get<StatusBarDisplayMode>('statusBarDisplayMode', 'expanded')
  );
}

export function shouldShowStatusBarScripts(): boolean {
  return (
    getWorkspacePreference('showStatusBarScripts') ??
    vscode.workspace.getConfiguration(configurationSection).get<boolean>('showStatusBarScripts', true)
  );
}

export function getStatusBarPriority(): number {
  return vscode.workspace.getConfiguration(configurationSection).get<number>('statusBarPriority', 10000);
}

export function getStatusBarPriorityStep(): number {
  return vscode.workspace.getConfiguration(configurationSection).get<number>('statusBarPriorityStep', 10);
}

export function getStatusBarOverflowLimit(): number {
  return vscode.workspace.getConfiguration(configurationSection).get<number>('statusBarOverflowLimit', 6);
}

export function shouldIncludeNestedGitRepositories(): boolean {
  return vscode.workspace.getConfiguration(configurationSection).get<boolean>('includeNestedGitRepositories', false);
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

export async function updateStatusBarDisplayMode(value: StatusBarDisplayMode) {
  await updateWorkspacePreference('statusBarDisplayMode', value);
}

export async function updateShowStatusBarScripts(value: boolean) {
  await updateWorkspacePreference('showStatusBarScripts', value);
}

export async function resetWorkspacePreferences() {
  const preferenceKeys: PreferenceKey[] = [
    'autoCloseScripts',
    'collapsedTreeGroups',
    'hideScripts',
    'showStatusBarScripts',
    'statusBarAlignment',
    'statusBarCommands',
    'statusBarDisplayMode',
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
