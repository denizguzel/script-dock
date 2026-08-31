import { ArrowRight, Eye } from 'lucide-react';

interface ChainPreviewProps {
  scriptNames: string[];
}

export function ChainPreview({ scriptNames }: ChainPreviewProps) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 border-t border-border pt-3 text-muted-foreground">
      <span className="inline-flex shrink-0 items-center gap-1.5 leading-5 text-foreground">
        <Eye aria-hidden="true" className="size-4 text-muted-foreground" strokeWidth={1.8} />
        <span>Preview</span>
      </span>
      {scriptNames.length === 0 ? (
        <span className="leading-5">No scripts selected</span>
      ) : (
        <span className="inline-flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-1 break-words leading-5">
          {scriptNames.map((scriptName, index) => (
            <span className="inline-flex items-center gap-1.5" key={`${scriptName}-${index}`}>
              {index > 0 ? (
                <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.8} />
              ) : null}
              <span>{scriptName}</span>
            </span>
          ))}
        </span>
      )}
    </div>
  );
}
