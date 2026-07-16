import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { getConfiguredScripts, shouldIncludeNestedGitRepositories } from './config';
import type { PackageJson, PackageRoot, ScriptEntry } from './types';

export async function getAllScripts(workspaceFolder: vscode.WorkspaceFolder): Promise<ScriptEntry[]> {
  const packageRoots = await getPackageRoots(workspaceFolder);

  return getScriptsForPackageRoots(packageRoots);
}

export async function getScriptsForPackageRoots(packageRoots: PackageRoot[]): Promise<ScriptEntry[]> {
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
  const packageJsonExcludePattern = await createPackageJsonExcludePattern(workspaceFolder);
  const packageJsonFiles = await vscode.workspace.findFiles(
    new vscode.RelativePattern(workspaceFolder, '**/package.json'),
    packageJsonExcludePattern,
    200,
  );

  const workspacePath = workspaceFolder.uri.fsPath;
  const packageJsonFilesToUse = shouldIncludeNestedGitRepositories()
    ? packageJsonFiles
    : await filterNestedRepositoryPackageJsonFiles(workspacePath, packageJsonFiles);

  const roots = await Promise.all(
    packageJsonFilesToUse.map(async (uri) => {
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

  return getVisibleScriptsFromScripts(scripts);
}

export function createScriptId(packagePath: string, scriptName: string): string {
  return packagePath === '.' ? scriptName : `${packagePath}#${scriptName}`;
}

function getVisibleScriptsFromScripts(scripts: ScriptEntry[]): ScriptEntry[] {
  const hiddenScripts = new Set(getConfiguredScripts('hideScripts'));

  return scripts.filter((script) => !hiddenScripts.has(script.id));
}

function normalizePackagePath(packagePath: string): string {
  return packagePath === '' ? '.' : packagePath.split(path.sep).join('/');
}

function sortScripts(scripts: ScriptEntry[]): ScriptEntry[] {
  return scripts.sort((left, right) => {
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

async function filterNestedRepositoryPackageJsonFiles(
  workspacePath: string,
  packageJsonFiles: vscode.Uri[],
): Promise<vscode.Uri[]> {
  const filesWithRepositoryState = await Promise.all(
    packageJsonFiles.map(async (uri) => ({
      isInsideNestedRepository: await isInsideNestedGitRepository(workspacePath, path.dirname(uri.fsPath)),
      uri,
    })),
  );

  return filesWithRepositoryState.filter((file) => !file.isInsideNestedRepository).map((file) => file.uri);
}

async function createPackageJsonExcludePattern(workspaceFolder: vscode.WorkspaceFolder): Promise<string> {
  const defaultExcludePattern = '**/{node_modules,dist,build,out,.git,.turbo,.next,coverage}/**';
  const excludePatterns = [defaultExcludePattern];

  if (!shouldIncludeNestedGitRepositories()) {
    excludePatterns.push(...(await findNestedGitRepositoryExcludePatterns(workspaceFolder)));
  }

  return excludePatterns.length === 1 ? defaultExcludePattern : `{${excludePatterns.join(',')}}`;
}

async function findNestedGitRepositoryExcludePatterns(workspaceFolder: vscode.WorkspaceFolder): Promise<string[]> {
  const gitMarkers = await vscode.workspace.findFiles(
    new vscode.RelativePattern(workspaceFolder, '**/.git'),
    '**/{node_modules,dist,build,out,.turbo,.next,coverage}/**',
    200,
  );

  return gitMarkers
    .map((uri) => normalizePackagePath(path.relative(workspaceFolder.uri.fsPath, path.dirname(uri.fsPath))))
    .filter((repositoryPath) => repositoryPath !== '.')
    .map((repositoryPath) => `${repositoryPath}/**`);
}

async function isInsideNestedGitRepository(workspacePath: string, packagePath: string): Promise<boolean> {
  const normalizedWorkspacePath = path.resolve(workspacePath);
  let currentPath = path.resolve(packagePath);

  while (currentPath !== normalizedWorkspacePath) {
    if (await pathExists(path.join(currentPath, '.git'))) {
      return true;
    }

    const parentPath = path.dirname(currentPath);

    if (parentPath === currentPath) {
      return false;
    }

    currentPath = parentPath;
  }

  return false;
}

async function pathExists(fsPath: string): Promise<boolean> {
  try {
    await fs.stat(fsPath);
    return true;
  } catch {
    return false;
  }
}
