import { CircleAlert, CircleCheck } from 'lucide-react';

interface ValidationHintProps {
  message: string;
}

export function ValidationHint({ message }: ValidationHintProps) {
  const isReady = message === 'Ready to save';
  const Icon = isReady ? CircleCheck : CircleAlert;

  return (
    <span
      className={
        isReady ? 'inline-flex items-center gap-1.5 text-success' : 'inline-flex items-center gap-1.5 text-warning'
      }
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.8} />
      <span>{message}</span>
    </span>
  );
}
