import { Monitor, Server } from 'lucide-react';
import { ToggleGroup } from '../../components/ui';
import type { ExecutionMode } from '../types';

interface ModeToggleProps {
  mode: ExecutionMode;
  onChange: (mode: ExecutionMode) => void;
}

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <ToggleGroup
      ariaLabel="Execution mode"
      options={[
        {
          icon: <Monitor aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />,
          label: 'Terminal',
          value: 'terminal',
        },
        {
          icon: <Server aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />,
          label: 'Background',
          value: 'background',
        },
      ]}
      value={mode}
      onChange={onChange}
    />
  );
}
