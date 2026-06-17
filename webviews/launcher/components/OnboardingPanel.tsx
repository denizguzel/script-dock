import { Lightbulb, Pin, Plus } from 'lucide-react';
import { Button } from '../../components/ui';
import type { VsCodeApi } from '../types';

interface OnboardingPanelProps {
  show: boolean;
  vscode: VsCodeApi;
}

export function OnboardingPanel({ show, vscode }: OnboardingPanelProps) {
  if (!show) {
    return null;
  }

  const createChain = () => {
    vscode.postMessage({ type: 'createChain' });
  };
  const addSuggestedChains = () => {
    vscode.postMessage({ type: 'addSuggestedChains' });
  };

  return (
    <section className="grid gap-2 border-b border-[var(--vscode-panel-border)] px-3 py-3 text-[var(--vscode-descriptionForeground)]">
      <div className="flex items-center gap-2 text-[var(--vscode-foreground)]">
        <Pin aria-hidden="true" className="h-4 w-4 text-[var(--vscode-testing-iconPassed)]" strokeWidth={1.8} />
        <strong>Pin scripts to build your dock.</strong>
      </div>
      <p className="m-0 text-xs">
        Use the pin icon beside a script, create a chain, or let Script Dock suggest common flows.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          icon={<Plus aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />}
          variant="secondary"
          onClick={createChain}
        >
          Create chain
        </Button>
        <Button
          icon={<Lightbulb aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />}
          variant="secondary"
          onClick={addSuggestedChains}
        >
          Suggest
        </Button>
      </div>
    </section>
  );
}
