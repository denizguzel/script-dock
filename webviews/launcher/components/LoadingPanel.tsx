export function LoadingPanel() {
  return (
    <section aria-label="Loading scripts" aria-live="polite" className="grid gap-2 px-3 py-4" role="status">
      {Array.from({ length: 5 }, (_, index) => (
        <div className="grid grid-cols-[1.75rem_1fr] items-center gap-2" key={index}>
          <div className="size-7 animate-pulse rounded-md bg-muted" />
          <div className="grid gap-1.5">
            <div className="h-3.5 w-2/5 animate-pulse rounded bg-muted" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </section>
  );
}
