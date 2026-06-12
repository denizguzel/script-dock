import * as vscode from 'vscode';
import type {
  CommandActivity,
  PackageManager,
  ScriptRunHistory,
  StatusBarAlignmentPreference,
  StatusBarCommand,
  StatusBarDisplayMode,
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

export function getCommandActivity(): CommandActivity[] {
  return getWorkspacePreference('commandActivity') ?? [];
}

export function getCollapsedTreeGroups(): string[] {
  return getWorkspacePreference('collapsedTreeGroups') ?? [];
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

export function getStatusBarDisplayMode(): StatusBarDisplayMode {
  return (
    getWorkspacePreference('statusBarDisplayMode') ??
    vscode.workspace
      .getConfiguration(configurationSection)
      .get<StatusBarDisplayMode>('statusBarDisplayMode', 'expanded')
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

export async function updateRunHistory(entry: ScriptRunHistory) {
  const history = getRunHistory().filter((item) => item.commandKey !== entry.commandKey);

  await updateWorkspacePreference('runHistory', [entry, ...history].slice(0, 50));
}

export async function updateCommandActivity(entry: CommandActivity) {
  const activity = getCommandActivity().filter((item) => item.commandKey !== entry.commandKey);

  await updateWorkspacePreference('commandActivity', [entry, ...activity].slice(0, 50));
}

export async function updateCollapsedTreeGroups(value: string[]) {
  await updateWorkspacePreference('collapsedTreeGroups', value);
}

export async function resetWorkspacePreferences() {
  const preferenceKeys: PreferenceKey[] = [
    'autoCloseScripts',
    'commandActivity',
    'collapsedTreeGroups',
    'favoriteScripts',
    'hideScripts',
    'runHistory',
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
