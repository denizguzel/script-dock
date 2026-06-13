import { ArrowDown, ArrowUp, GripVertical, Trash2 } from 'lucide-react';
import type { DragEvent } from 'react';
import { useState } from 'react';
import { IconButton } from '../../components/ui';

type DropPosition = 'after' | 'before';

interface OrderedScriptProps {
  command: string;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  name: string;
  onDropScript: (sourceIndex: number, insertIndex: number) => void;
  onMoveScript: (sourceIndex: number, targetIndex: number) => void;
  onRemoveScript: (index: number) => void;
}

export function OrderedScript({
  command,
  index,
  isFirst,
  isLast,
  name,
  onDropScript,
  onMoveScript,
  onRemoveScript,
}: OrderedScriptProps) {
  const [dropPosition, setDropPosition] = useState<DropPosition | undefined>();

  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDropPosition(getDropPosition(event));
  };

  const handleDragLeave = () => {
    setDropPosition(undefined);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const position = dropPosition ?? getDropPosition(event);
    setDropPosition(undefined);
    onDropScript(Number(event.dataTransfer.getData('text/plain')), position === 'after' ? index + 1 : index);
  };

  return (
    <div
      draggable
      className={[
        'relative mb-1 grid min-h-10 grid-cols-[1.5rem_2rem_1fr_auto] items-center gap-2 border border-transparent px-2 py-1 hover:bg-[var(--vscode-list-hoverBackground)]',
        dropPosition === 'before'
          ? 'before:absolute before:left-2 before:right-2 before:top-0 before:h-px before:bg-[var(--vscode-focusBorder)]'
          : '',
        dropPosition === 'after'
          ? 'after:absolute after:bottom-0 after:left-2 after:right-2 after:h-px after:bg-[var(--vscode-focusBorder)]'
          : '',
      ].join(' ')}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDragStart={handleDragStart}
      onDrop={handleDrop}
    >
      <GripVertical
        aria-hidden="true"
        className="h-4 w-4 text-[var(--vscode-descriptionForeground)]"
        strokeWidth={1.8}
      />
      <span className="text-center text-[var(--vscode-descriptionForeground)]">{index + 1}</span>
      <span className="min-w-0">
        <span className="block overflow-hidden text-ellipsis whitespace-nowrap">{name}</span>
        <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-[var(--vscode-descriptionForeground)]">
          {command}
        </span>
      </span>
      <span className="flex gap-1">
        <IconButton disabled={isFirst} icon={ArrowUp} label="Move up" onClick={() => onMoveScript(index, index - 1)} />
        <IconButton
          disabled={isLast}
          icon={ArrowDown}
          label="Move down"
          onClick={() => onMoveScript(index, index + 1)}
        />
        <IconButton icon={Trash2} label="Remove" onClick={() => onRemoveScript(index)} />
      </span>
    </div>
  );
}

function getDropPosition(event: DragEvent<HTMLDivElement>): DropPosition {
  const rect = event.currentTarget.getBoundingClientRect();

  return event.clientY > rect.top + rect.height / 2 ? 'after' : 'before';
}
