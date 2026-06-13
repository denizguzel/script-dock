interface ChainPreviewProps {
  scriptNames: string[];
}

export function ChainPreview({ scriptNames }: ChainPreviewProps) {
  return (
    <div className="min-w-0 border-t border-[var(--vscode-panel-border)] pt-3 text-[var(--vscode-descriptionForeground)]">
      <span className="mr-2 text-[var(--vscode-foreground)]">Preview</span>
      {scriptNames.length === 0 ? (
        <span>No scripts selected</span>
      ) : (
        <span className="break-words">{scriptNames.join(' -> ')}</span>
      )}
    </div>
  );
}
