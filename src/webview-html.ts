import * as vscode from 'vscode';

export function createWebviewHtml(options: {
  extensionUri: vscode.Uri;
  scriptFileName: string;
  state: unknown;
  stateGlobalName: string;
  title: string;
  webview: vscode.Webview;
}): string {
  const nonce = createNonce();
  const scriptUri = options.webview.asWebviewUri(
    vscode.Uri.joinPath(options.extensionUri, 'dist', 'webviews', options.scriptFileName),
  );
  const styleUri = options.webview.asWebviewUri(
    vscode.Uri.joinPath(options.extensionUri, 'dist', 'webviews', 'style.css'),
  );
  const serializedState = JSON.stringify(options.state).replace(/</g, '\\u003c');

  return /* html */ `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; img-src ${options.webview.cspSource} https:; style-src ${options.webview.cspSource}; script-src 'nonce-${nonce}' ${options.webview.cspSource};"
    />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link href="${styleUri}" rel="stylesheet" />
    <title>${escapeHtml(options.title)}</title>
  </head>
  <body>
    <div id="root"></div>
    <script nonce="${nonce}">window.${options.stateGlobalName} = ${serializedState};</script>
    <script nonce="${nonce}" type="module" src="${scriptUri}"></script>
  </body>
</html>`;
}

function createNonce(): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';

  for (let index = 0; index < 32; index += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return text;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
