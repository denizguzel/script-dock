import { ScriptRow } from './ScriptRow';
import { Section } from './Section';
import type { ScriptViewModel, VsCodeApi } from '../types';

interface ScriptListSectionProps {
  onSelectScript: (script: ScriptViewModel) => void;
  selectedScriptId: string | null;
  scripts: ScriptViewModel[];
  title: string;
  vscode: VsCodeApi;
}

export function ScriptListSection({
  onSelectScript,
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
      {scripts.map((script) => (
        <ScriptRow
          key={script.id}
          isSelected={script.id === selectedScriptId}
          onSelect={onSelectScript}
          script={script}
          vscode={vscode}
        />
      ))}
    </Section>
  );
}
