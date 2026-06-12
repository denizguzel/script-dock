import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { getConfiguredScripts } from './config';
import type { PackageJson, ScriptEntry } from './types';

export async function getAllScripts(workspaceFolder: vscode.WorkspaceFolder): Promise<ScriptEntry[]> {
  const packageJson = await readPackageJson(workspaceFolder);
  const scripts = Object.entries(packageJson.scripts ?? {}).map(([name, command]) => ({ name, command }));

  return sortScripts(scripts);
}

export async function getVisibleScripts(workspaceFolder: vscode.WorkspaceFolder): Promise<ScriptEntry[]> {
  const scripts = await getAllScripts(workspaceFolder);
  const hiddenScripts = new Set(getConfiguredScripts('hideScripts'));

  return scripts.filter((script) => !hiddenScripts.has(script.name));
}

export function getFavoriteScripts(scripts: ScriptEntry[]): ScriptEntry[] {
  const favoriteNames = new Set(getConfiguredScripts('favoriteScripts'));

  return scripts.filter((script) => favoriteNames.has(script.name));
}

export function getNonFavoriteScripts(scripts: ScriptEntry[]): ScriptEntry[] {
  const favoriteNames = new Set(getConfiguredScripts('favoriteScripts'));

  return scripts.filter((script) => !favoriteNames.has(script.name));
}

function sortScripts(scripts: ScriptEntry[]): ScriptEntry[] {
  const favorites = getConfiguredScripts('favoriteScripts');
  const favoriteIndex = new Map(favorites.map((script, index) => [script, index]));

  return scripts.sort((left, right) => {
    const leftFavorite = favoriteIndex.get(left.name);
    const rightFavorite = favoriteIndex.get(right.name);

    if (leftFavorite !== undefined && rightFavorite !== undefined) {
      return leftFavorite - rightFavorite;
    }

    if (leftFavorite !== undefined) {
      return -1;
    }

    if (rightFavorite !== undefined) {
      return 1;
    }

    return left.name.localeCompare(right.name);
  });
}

async function readPackageJson(workspaceFolder: vscode.WorkspaceFolder): Promise<PackageJson> {
  const packageJsonPath = path.join(workspaceFolder.uri.fsPath, 'package.json');

  try {
    const content = await fs.readFile(packageJsonPath, 'utf8');
    return JSON.parse(content) as PackageJson;
  } catch {
    vscode.window.showWarningMessage(`Could not read package.json from ${workspaceFolder.name}.`);
    return {};
  }
}
