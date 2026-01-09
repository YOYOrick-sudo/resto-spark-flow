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
    // Altijd transform - zorgt dat andere items opschuiven
    transform: CSS.Transform.toString(transform),
    // Snelle transition
    transition: 'transform 150ms ease',
    // Volledig verbergen tijdens drag (Notion-style, geen ghost)
    opacity: isDragging ? 0 : 1,
    visibility: isDragging ? 'hidden' : 'visible',
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
