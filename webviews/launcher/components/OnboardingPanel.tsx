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
    <section className="grid gap-2 border-b border-border px-3 py-3 text-muted-foreground">
      <div className="flex items-center gap-2 text-foreground">
        <Pin aria-hidden="true" className="size-4 text-success" strokeWidth={1.8} />
        <strong>Pin scripts to build your dock.</strong>
      </div>
      <p className="m-0 text-xs">
        Open a script&apos;s three-dot menu to pin it, create a chain, or use a suggested flow.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          startIcon={<Plus aria-hidden="true" className="size-4" strokeWidth={1.8} />}
          variant="secondary"
          onClick={createChain}
        >
          Create chain
        </Button>
        <Button
          startIcon={<Lightbulb aria-hidden="true" className="size-4" strokeWidth={1.8} />}
          variant="secondary"
          onClick={addSuggestedChains}
        >
          Suggest
        </Button>
      </div>
    </section>
  );
}
