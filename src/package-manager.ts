import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { getConfiguredPackageManager } from './config';
import type { ResolvedPackageManager } from './types';

export async function resolvePackageManager(workspacePath: string): Promise<ResolvedPackageManager> {
  const configured = getConfiguredPackageManager();

  if (configured !== 'auto') {
    return configured;
  }

  if (await fileExists(path.join(workspacePath, 'bun.lock'))) {
    return 'bun';
  }

  if (await fileExists(path.join(workspacePath, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }

  if (await fileExists(path.join(workspacePath, 'yarn.lock'))) {
    return 'yarn';
  }

  return 'npm';
}

export function getConfiguredPackageManagerLabel(): ResolvedPackageManager {
  const configured = getConfiguredPackageManager();

  return configured === 'auto' ? 'bun' : configured;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
