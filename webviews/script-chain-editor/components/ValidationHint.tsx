interface ValidationHintProps {
  message: string;
}

export function ValidationHint({ message }: ValidationHintProps) {
  return <span className="text-[var(--vscode-descriptionForeground)]">{message}</span>;
}
