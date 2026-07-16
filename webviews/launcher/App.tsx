import { useEffect, useMemo, useState } from 'react';
import { EmptyPanel } from './components/EmptyPanel';
import { FilterTabs } from './components/FilterTabs';
import { OnboardingPanel } from './components/OnboardingPanel';
import { PanelFrame } from './components/PanelFrame';
import { PinnedScriptsSection } from './components/PinnedScriptsSection';
import { ScriptListSection } from './components/ScriptListSection';
import { SearchBox } from './components/SearchBox';
import { StatusBarSettings } from './components/StatusBarSettings';
import { TopRunner } from './components/TopRunner';
import { getSelectedPinnedScript, isStateMessage } from './launcher-state';
import type { LauncherState, ScriptFilter, ScriptViewModel, VsCodeApi } from './types';

interface AppProps {
  initialState: LauncherState;
  vscode: VsCodeApi;
}

export function App({ initialState, vscode }: AppProps) {
  const [filter, setFilter] = useState<ScriptFilter>(initialState.selectedFilter);
  const [search, setSearch] = useState('');
  const [selectedScript, setSelectedScript] = useState<ScriptViewModel | undefined>();
  const [state, setState] = useState(initialState);
  const selectedPinnedScript = useMemo(() => getSelectedPinnedScript(state), [state]);
  const pinnedScripts = useMemo(() => filterPinnedScripts(state.pinnedScripts, search), [state.pinnedScripts, search]);
  const allScripts = useMemo(
    () =>
      filterScripts(
        state.allScripts.filter((script) => !script.isPinned),
        search,
      ),
    [state.allScripts, search],
  );
  const hiddenScripts = useMemo(() => filterScripts(state.hiddenScripts, search), [state.hiddenScripts, search]);
  const runnableScripts = useMemo(() => filterScripts(state.allScripts, search), [state.allScripts, search]);
  const filterCounts = useMemo(
    () => ({
      all: pinnedScripts.length + allScripts.length,
      hidden: hiddenScripts.length,
      pinned: pinnedScripts.length,
      runnable: runnableScripts.length,
    }),
    [allScripts.length, hiddenScripts.length, pinnedScripts.length, runnableScripts.length],
  );

  useEffect(() => {
    const handleMessage = (event: MessageEvent<unknown>) => {
      const message = event.data;

      if (isStateMessage(message)) {
        setState(message.state);
        setFilter(message.state.selectedFilter);
      }
    };

    window.addEventListener('message', handleMessage);
    vscode.postMessage({ type: 'ready' });

    return () => window.removeEventListener('message', handleMessage);
  }, [vscode]);

  useEffect(() => {
    if (!selectedScript) {
      return;
    }

    const nextSelectedScript = [...state.allScripts, ...state.hiddenScripts].find(
      (script) => script.id === selectedScript.id,
    );

    if (nextSelectedScript !== selectedScript) {
      setSelectedScript(nextSelectedScript);
    }
  }, [selectedScript, state.allScripts, state.hiddenScripts]);

  const setPersistedFilter = (nextFilter: ScriptFilter) => {
    setFilter(nextFilter);
    vscode.postMessage({ filter: nextFilter, type: 'setFilter' });
  };

  return (
    <PanelFrame>
      <TopRunner
        hiddenScriptCount={state.hiddenScriptCount}
        pinnedScripts={state.pinnedScripts}
        selectedScript={selectedPinnedScript}
        vscode={vscode}
      />
      <StatusBarSettings statusBar={state.statusBar} vscode={vscode} />
      <SearchBox value={search} onChange={setSearch} />
      <FilterTabs counts={filterCounts} value={filter} onChange={setPersistedFilter} />
      <div className="min-h-0 flex-1 overflow-auto">
        {state.isLoading ? (
          <div className="px-3 py-5 text-[var(--vscode-descriptionForeground)]">Loading scripts...</div>
        ) : null}
        {!state.isLoading ? <EmptyPanel empty={state.empty} vscode={vscode} /> : null}
        {!state.isLoading && state.empty.kind === 'none' ? (
          <>
            <OnboardingPanel
              show={
                filter === 'all' &&
                search.trim().length === 0 &&
                state.pinnedScripts.length === 0 &&
                state.allScripts.length > 0
              }
              vscode={vscode}
            />
            <ScriptSections
              allScripts={allScripts}
              filter={filter}
              hiddenScripts={hiddenScripts}
              pinnedScripts={pinnedScripts}
              runnableScripts={runnableScripts}
              selectedPinnedKey={state.selectedPinnedKey}
              selectedScriptId={selectedScript?.id ?? null}
              vscode={vscode}
              onSelectScript={setSelectedScript}
            />
          </>
        ) : null}
      </div>
    </PanelFrame>
  );
}

function ScriptSections(props: {
  allScripts: ScriptViewModel[];
  filter: ScriptFilter;
  hiddenScripts: ScriptViewModel[];
  pinnedScripts: LauncherState['pinnedScripts'];
  runnableScripts: ScriptViewModel[];
  selectedPinnedKey: string | null;
  selectedScriptId: string | null;
  vscode: VsCodeApi;
  onSelectScript: (script: ScriptViewModel) => void;
}) {
  if (props.filter === 'pinned') {
    if (props.pinnedScripts.length === 0) {
      return <EmptyListMessage message="No pinned scripts yet." />;
    }

    return (
      <PinnedScriptsSection
        pinnedScripts={props.pinnedScripts}
        selectedKey={props.selectedPinnedKey}
        vscode={props.vscode}
      />
    );
  }

  if (props.filter === 'runnable') {
    if (props.runnableScripts.length === 0) {
      return <EmptyListMessage message="No runnable scripts match this view." />;
    }

    return (
      <ScriptListSection
        onSelectScript={props.onSelectScript}
        scripts={props.runnableScripts}
        selectedScriptId={props.selectedScriptId}
        title="Runnable Scripts"
        vscode={props.vscode}
      />
    );
  }

  if (props.filter === 'hidden') {
    if (props.hiddenScripts.length === 0) {
      return <EmptyListMessage message="No hidden scripts." />;
    }

    return (
      <ScriptListSection
        onSelectScript={props.onSelectScript}
        scripts={props.hiddenScripts}
        selectedScriptId={props.selectedScriptId}
        title="Hidden Scripts"
        vscode={props.vscode}
      />
    );
  }

  return (
    <>
      <PinnedScriptsSection
        pinnedScripts={props.pinnedScripts}
        selectedKey={props.selectedPinnedKey}
        vscode={props.vscode}
      />
      <ScriptListSection
        onSelectScript={props.onSelectScript}
        scripts={props.allScripts}
        selectedScriptId={props.selectedScriptId}
        title="All Scripts"
        vscode={props.vscode}
      />
    </>
  );
}

function EmptyListMessage({ message }: { message: string }) {
  return <div className="px-3 py-5 text-[var(--vscode-descriptionForeground)]">{message}</div>;
}

function filterScripts(scripts: ScriptViewModel[], search: string): ScriptViewModel[] {
  const query = search.trim().toLowerCase();

  if (query.length === 0) {
    return scripts;
  }

  return scripts.filter((script) =>
    [script.name, script.command, script.packageLabel, script.packagePath].some((value) =>
      value.toLowerCase().includes(query),
    ),
  );
}

function filterPinnedScripts(scripts: LauncherState['pinnedScripts'], search: string): LauncherState['pinnedScripts'] {
  const query = search.trim().toLowerCase();

  if (query.length === 0) {
    return scripts;
  }

  return scripts.filter((script) =>
    [script.label, script.packagePath, ...script.scripts].some((value) => value.toLowerCase().includes(query)),
  );
}
