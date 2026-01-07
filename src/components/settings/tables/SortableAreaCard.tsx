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
    // Item moves inline via transform
    transform: CSS.Transform.toString(transform),
    transition,
    // Subtle visual feedback during drag
    opacity: isDragging ? 0.95 : 1,
    zIndex: isDragging ? 10 : 'auto',
    boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
    position: 'relative',
  };

  const dragHandle = (
    <button
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded touch-none"
      aria-label="Versleep om te herschikken"
    >
      <GripVertical className="h-4 w-4 text-muted-foreground" />
    </button>
  );

  return (
    <div ref={setNodeRef} style={style}>
      <AreaCard {...props} dragHandle={dragHandle} />
    </div>
  );
}
