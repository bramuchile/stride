import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";

interface GripHandleProps {
  isColumnHandle: boolean;
  listeners: SyntheticListenerMap | undefined;
  attributes?: DraggableAttributes;
  dragId?: string;
}

export function GripHandle({ isColumnHandle, listeners, attributes, dragId }: GripHandleProps) {
  return (
    <button
      type="button"
      className={`grip-handle ${isColumnHandle ? "grip-col" : "grip-panel"}`}
      {...attributes}
      data-drag-id={dragId}
      onPointerDown={(e) => {
        e.stopPropagation();
        listeners?.onPointerDown?.(e as unknown as PointerEvent);
      }}
      aria-label={isColumnHandle ? "Drag to reorder column" : "Drag to reorder panel"}
    >
      <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" aria-hidden="true">
        <circle cx="2" cy="2" r="1.5" />
        <circle cx="8" cy="2" r="1.5" />
        <circle cx="2" cy="7" r="1.5" />
        <circle cx="8" cy="7" r="1.5" />
        <circle cx="2" cy="12" r="1.5" />
        <circle cx="8" cy="12" r="1.5" />
      </svg>
    </button>
  );
}
