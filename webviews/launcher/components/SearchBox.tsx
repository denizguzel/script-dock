import type { ChangeEvent } from 'react';
import { Search } from 'lucide-react';
import { Input } from '../../components/ui';

interface SearchBoxProps {
  onChange: (value: string) => void;
  value: string;
}

export function SearchBox({ onChange, value }: SearchBoxProps) {
  const updateSearch = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  return (
    <label className="relative block border-b border-border p-2">
      <span className="sr-only">Search scripts or packages</span>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        strokeWidth={1.8}
      />
      <Input
        className="pl-8"
        placeholder="Search scripts or packages"
        type="search"
        value={value}
        onChange={updateSearch}
      />
    </label>
  );
}
