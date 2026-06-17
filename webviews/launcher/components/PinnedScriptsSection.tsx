import { Play, Square } from 'lucide-react';
import { IconButton } from '../../components/ui';
import { Section } from './Section';
import { PinnedScriptRow } from './PinnedScriptRow';
import type { PinnedScriptViewModel, VsCodeApi } from '../types';

interface PinnedScriptsSectionProps {
  pinnedScripts: PinnedScriptViewModel[];
  selectedKey: string | null;
  vscode: VsCodeApi;
}

export function PinnedScriptsSection({ pinnedScripts, selectedKey, vscode }: PinnedScriptsSectionProps) {
  if (pinnedScripts.length === 0) {
    return null;
  }

  const hasRunningScript = pinnedScripts.some((script) => script.runStatus.state === 'running');
  const runAll = () => {
    vscode.postMessage({ type: 'runAllPinned' });
  };
  const stopAll = () => {
    vscode.postMessage({ type: 'stopAllPinned' });
  };

  return (
    <Section
      actions={
        <>
          <IconButton icon={Play} label="Run all pinned scripts" onClick={runAll} />
          <IconButton
            disabled={!hasRunningScript}
            icon={Square}
            label="Stop all running pinned scripts"
            onClick={stopAll}
          />
        </>
      }
      count={pinnedScripts.length}
      title="Pinned Scripts"
    >
      {pinnedScripts.map((script, index) => (
        <PinnedScriptRow
          key={script.key}
          canMoveDown={index < pinnedScripts.length - 1}
          canMoveUp={index > 0}
          isSelected={script.key === selectedKey}
          script={script}
          vscode={vscode}
        />
      ))}
    </Section>
  );
}
