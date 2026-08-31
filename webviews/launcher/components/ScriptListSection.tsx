import { ListChecks } from 'lucide-react';
import { ScriptRow } from './ScriptRow';
import { Section } from './Section';
import type { ScriptViewModel, VsCodeApi } from '../types';

interface ScriptListSectionProps {
  scripts: ScriptViewModel[];
  title: string;
  vscode: VsCodeApi;
}

export function ScriptListSection({ scripts, title, vscode }: ScriptListSectionProps) {
  if (scripts.length === 0) {
    return null;
  }

  return (
    <Section count={scripts.length} icon={ListChecks} title={title}>
      {scripts.map((script) => (
        <ScriptRow key={script.id} script={script} vscode={vscode} />
      ))}
    </Section>
  );
}
