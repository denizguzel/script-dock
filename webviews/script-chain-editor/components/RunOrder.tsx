import { PanelSection } from '../../components/ui';
import type { ScriptOption } from '../types';
import { OrderedScript } from './OrderedScript';

interface RunOrderProps {
  scriptByName: Map<string, ScriptOption>;
  selectedNames: string[];
  onDropScript: (sourceIndex: number, insertIndex: number) => void;
  onMoveScript: (sourceIndex: number, targetIndex: number) => void;
  onRemoveScript: (index: number) => void;
}

export function RunOrder({ scriptByName, selectedNames, onDropScript, onMoveScript, onRemoveScript }: RunOrderProps) {
  return (
    <PanelSection
      className="border-l border-[var(--vscode-panel-border)]"
      count={selectedNames.length}
      title="Run Order"
    >
      {selectedNames.length === 0 ? (
        <div className="p-4 text-[var(--vscode-descriptionForeground)]">Select scripts from the left.</div>
      ) : (
        selectedNames.map((scriptName, index) => {
          const script = scriptByName.get(scriptName);

          return (
            <OrderedScript
              key={scriptName}
              command={script?.command ?? ''}
              index={index}
              isFirst={index === 0}
              isLast={index === selectedNames.length - 1}
              name={scriptName}
              onDropScript={onDropScript}
              onMoveScript={onMoveScript}
              onRemoveScript={onRemoveScript}
            />
          );
        })
      )}
    </PanelSection>
  );
}
