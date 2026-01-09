import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { AreaCard, type AreaCardProps } from "./AreaCard";

interface SortableAreaCardProps extends Omit<AreaCardProps, 'dragHandle'> {
  id: string;
}

export function SortableAreaCard({ id, ...props }: SortableAreaCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    // Smooth transition when not dragging, instant when dragging
    transition: isDragging ? 'none' : 'transform 200ms cubic-bezier(0.25, 1, 0.5, 1), opacity 150ms ease',
    // Notion-like: hide original completely, keep space
    opacity: isDragging ? 0 : 1,
    visibility: isDragging ? 'hidden' : 'visible',
    zIndex: isDragging ? 10 : 'auto',
  };

  const dragHandle = (
    <button
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded touch-none transition-colors"
      aria-label="Versleep om te herschikken"
    >
      <GripVertical className="h-4 w-4 text-muted-foreground" />
    </button>
  );

  return (
    <div ref={setNodeRef} style={style} className="group">
      <AreaCard {...props} dragHandle={dragHandle} />
    </div>
  );
}
