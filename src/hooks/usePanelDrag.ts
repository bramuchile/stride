import type { CSSProperties } from "react";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface UseSortableResult {
  ref: (node: HTMLElement | null) => void;
  style: CSSProperties;
  listeners: SyntheticListenerMap | undefined;
  attributes: DraggableAttributes;
  isDragging: boolean;
}

export function useDraggable(id: string): UseSortableResult {
  const { setNodeRef, transform, transition, listeners, attributes, isDragging } =
    useSortable({ id });

  return {
    ref: setNodeRef,
    style: {
      transform: CSS.Transform.toString(transform),
      transition,
    },
    listeners,
    attributes,
    isDragging,
  };
}
