import { Eye, FolderOpen, PackageSearch, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui';
import type { LauncherState, VsCodeApi } from '../types';

interface EmptyPanelProps {
  empty: LauncherState['empty'];
  vscode: VsCodeApi;
}

export function EmptyPanel({ empty, vscode }: EmptyPanelProps) {
  if (empty.kind === 'none') {
    return null;
  }

  const refreshScripts = () => {
    vscode.postMessage({ type: 'refresh' });
  };
  const showHiddenScript = () => {
    vscode.postMessage({ type: 'showHiddenScript' });
  };
  const Icon = empty.kind === 'noWorkspace' ? FolderOpen : PackageSearch;

  return (
    <section className="grid gap-3 px-3 py-5 text-[var(--vscode-descriptionForeground)]">
      <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
      <p className="m-0">{empty.message}</p>
      <div className="flex flex-wrap gap-2">
        {empty.kind === 'allHidden' ? (
          <Button
            icon={<Eye aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />}
            variant="secondary"
            onClick={showHiddenScript}
          >
            Show hidden
          </Button>
        ) : null}
        {empty.kind !== 'noWorkspace' ? (
          <Button
            icon={<RefreshCw aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />}
            variant="secondary"
            onClick={refreshScripts}
          >
            Refresh
          </Button>
        ) : null}
      </div>
    </section>
  );
}
