import { ScriptRow } from './ScriptRow';
import { Section } from './Section';
import type { ScriptViewModel, VsCodeApi } from '../types';

interface ScriptListSectionProps {
  onSelectScript: (script: ScriptViewModel) => void;
  reorderable?: boolean;
  selectedScriptId: string | null;
  scripts: ScriptViewModel[];
  title: string;
  vscode: VsCodeApi;
}

export function ScriptListSection({
  onSelectScript,
  reorderable = false,
  scripts,
  selectedScriptId,
  title,
  vscode,
}: ScriptListSectionProps) {
  if (scripts.length === 0) {
    return null;
  }

  return (
    <Section count={scripts.length} title={title}>
      {scripts.map((script, index) => (
        <ScriptRow
          key={script.id}
          canMoveDown={index < scripts.length - 1}
          canMoveUp={index > 0}
          isSelected={script.id === selectedScriptId}
          onSelect={onSelectScript}
          reorderable={reorderable}
          script={script}
          vscode={vscode}
        />
      ))}
    </Section>
  );
}
