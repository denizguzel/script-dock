import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { TooltipProvider } from '../components/ui';
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
    <TooltipProvider>
      <App initialState={window.__SCRIPT_DOCK_CHAIN_EDITOR_STATE__} vscode={window.acquireVsCodeApi()} />
    </TooltipProvider>
  </StrictMode>,
);
