import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';
import type { ChainEditorState, VsCodeApi } from './types';

declare global {
  interface Window {
    __SCRIPT_DOCK_CHAIN_EDITOR_STATE__: ChainEditorState;
    acquireVsCodeApi(): VsCodeApi;
  }
}

const root = document.getElementById('root');

if (!root) {
  throw new Error('Script Dock webview root element was not found.');
}

createRoot(root).render(
  <StrictMode>
    <App initialState={window.__SCRIPT_DOCK_CHAIN_EDITOR_STATE__} vscode={window.acquireVsCodeApi()} />
  </StrictMode>,
);
