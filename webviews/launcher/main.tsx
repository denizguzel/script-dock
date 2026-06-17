import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import '../script-chain-editor/styles.css';
import type { LauncherState, VsCodeApi } from './types';

declare global {
  interface Window {
    __SCRIPT_DOCK_LAUNCHER_STATE__: LauncherState;
    acquireVsCodeApi(): VsCodeApi;
  }
}

const root = document.getElementById('root');

if (!root) {
  throw new Error('Script Dock launcher root element was not found.');
}

createRoot(root).render(
  <StrictMode>
    <App initialState={window.__SCRIPT_DOCK_LAUNCHER_STATE__} vscode={window.acquireVsCodeApi()} />
  </StrictMode>,
);
