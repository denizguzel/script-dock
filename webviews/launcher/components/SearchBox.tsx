import type { ChangeEvent } from 'react';
import { Search } from 'lucide-react';

interface SearchBoxProps {
  onChange: (value: string) => void;
  value: string;
}

export function SearchBox({ onChange, value }: SearchBoxProps) {
  const updateSearch = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  return (
    <label className="relative block border-b border-[var(--vscode-panel-border)] p-2">
      <span className="sr-only">Search scripts</span>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--vscode-descriptionForeground)]"
        strokeWidth={1.8}
      />
      <input
        className="h-8 w-full rounded-sm border border-[var(--vscode-input-border,transparent)] bg-[var(--vscode-input-background)] pl-8 pr-2 text-[var(--vscode-input-foreground)] outline-none placeholder:text-[var(--vscode-input-placeholderForeground)] focus:border-[var(--vscode-focusBorder)]"
        placeholder="Search scripts"
        type="search"
        value={value}
        onChange={updateSearch}
      />
    </label>
  );
}
