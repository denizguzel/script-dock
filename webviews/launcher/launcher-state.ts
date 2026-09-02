import type { PinnedScriptViewModel, ScriptDockState } from '../../src/types';

export function getSelectedPinnedScript(state: ScriptDockState): PinnedScriptViewModel | undefined {
  return state.pinnedScripts.find((script) => script.key === state.selectedPinnedKey) ?? state.pinnedScripts[0];
}

export function isStateMessage(value: unknown): value is { state: ScriptDockState; type: 'state' } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === 'state' &&
    'state' in value &&
    typeof value.state === 'object' &&
    value.state !== null
  );
}
