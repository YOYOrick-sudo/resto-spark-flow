import { GripVertical } from "lucide-react";
import { NestoCard } from "@/components/polar/NestoCard";
import type { AreaWithTables } from "@/types/reservations";

interface AreaDragOverlayProps {
  area: AreaWithTables;
}

export function AreaDragOverlay({ area }: AreaDragOverlayProps) {
  const activeTableCount = (area.tables ?? []).filter(t => t.is_active).length;

  return (
    <NestoCard className="pointer-events-none shadow-lg border-primary/20">
      <div className="flex items-center gap-3 p-4 bg-muted/30">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{area.name}</span>
        <span className="text-sm text-muted-foreground">
          ({activeTableCount} {activeTableCount === 1 ? 'tafel' : 'tafels'})
        </span>
      </div>
    </NestoCard>
  );
}
