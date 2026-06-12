import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { getConfiguredScripts } from './config';
import type { PackageJson, PackageRoot, ScriptEntry } from './types';

export async function getAllScripts(workspaceFolder: vscode.WorkspaceFolder): Promise<ScriptEntry[]> {
  const packageRoots = await getPackageRoots(workspaceFolder);
  const scriptsByRoot = await Promise.all(
    packageRoots.map(async (packageRoot) => {
      const packageJson = await readPackageJson(packageRoot.fsPath);

      return Object.entries(packageJson.scripts ?? {}).map(([name, command]) => ({
        command,
        id: createScriptId(packageRoot.packagePath, name),
        name,
        packageRoot,
      }));
    }),
  );

  return sortScripts(scriptsByRoot.flat());
}

export async function getPackageRoots(workspaceFolder: vscode.WorkspaceFolder): Promise<PackageRoot[]> {
  const packageJsonFiles = await vscode.workspace.findFiles(
    new vscode.RelativePattern(workspaceFolder, '**/package.json'),
    '**/{node_modules,dist,build,out,.git,.turbo,.next,coverage}/**',
    200,
  );

  const roots = await Promise.all(
    packageJsonFiles.map(async (uri) => {
      const fsPath = path.dirname(uri.fsPath);
      const packagePath = normalizePackagePath(path.relative(workspaceFolder.uri.fsPath, fsPath));
      const packageJson = await readPackageJson(fsPath);

      return {
        fsPath,
        label: createPackageRootLabel(packagePath, packageJson),
        packagePath,
      };
    }),
  );

  return roots.sort((left, right) => {
    if (left.packagePath === '.') {
      return -1;
    }

    if (right.packagePath === '.') {
      return 1;
    }

    return left.packagePath.localeCompare(right.packagePath);
  });
}

export async function getVisibleScripts(workspaceFolder: vscode.WorkspaceFolder): Promise<ScriptEntry[]> {
  const scripts = await getAllScripts(workspaceFolder);
  const hiddenScripts = new Set(getConfiguredScripts('hideScripts'));

  return scripts.filter((script) => !hiddenScripts.has(script.name));
}

export function getFavoriteScripts(scripts: ScriptEntry[]): ScriptEntry[] {
  const favoriteNames = new Set(getConfiguredScripts('favoriteScripts'));

  return scripts.filter((script) => favoriteNames.has(script.id));
}

export function getNonFavoriteScripts(scripts: ScriptEntry[]): ScriptEntry[] {
  const favoriteNames = new Set(getConfiguredScripts('favoriteScripts'));

  return scripts.filter((script) => !favoriteNames.has(script.id));
}

export function createScriptId(packagePath: string, scriptName: string): string {
  return packagePath === '.' ? scriptName : `${packagePath}#${scriptName}`;
}

function normalizePackagePath(packagePath: string): string {
  return packagePath === '' ? '.' : packagePath.split(path.sep).join('/');
}

function sortScripts(scripts: ScriptEntry[]): ScriptEntry[] {
  const favorites = getConfiguredScripts('favoriteScripts');
  const favoriteIndex = new Map(favorites.map((scriptId, index) => [scriptId, index]));

  return scripts.sort((left, right) => {
    const leftFavorite = favoriteIndex.get(left.id);
    const rightFavorite = favoriteIndex.get(right.id);

    if (leftFavorite !== undefined && rightFavorite !== undefined) {
      return leftFavorite - rightFavorite;
    }

    if (leftFavorite !== undefined) {
      return -1;
    }

    if (rightFavorite !== undefined) {
      return 1;
    }

    if (left.packageRoot.packagePath !== right.packageRoot.packagePath) {
      return left.packageRoot.packagePath.localeCompare(right.packageRoot.packagePath);
    }

    return left.name.localeCompare(right.name);
  });
}

async function readPackageJson(packagePath: string): Promise<PackageJson> {
  const packageJsonPath = path.join(packagePath, 'package.json');

  try {
    const content = await fs.readFile(packageJsonPath, 'utf8');
    return JSON.parse(content) as PackageJson;
  } catch {
    vscode.window.showWarningMessage(`Could not read package.json from ${packagePath}.`);
    return {};
  }
}

function createPackageRootLabel(packagePath: string, packageJson: PackageJson): string {
  if (packagePath === '.') {
    return packageJson.name ?? 'Workspace';
  }

  return packageJson.name ? `${packageJson.name} (${packagePath})` : packagePath;
}
