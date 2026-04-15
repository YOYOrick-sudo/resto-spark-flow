import { Star, X } from "lucide-react";
import { useMepFavorieten, useRemoveMepFavoriet, type MepFavoriet } from "@/hooks/useMepFavorieten";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface MepFavorietenProps {
  onSelect: (fav: MepFavoriet) => void;
  isPending?: boolean;
}

export function MepFavorieten({ onSelect, isPending }: MepFavorietenProps) {
  const { data: favorieten = [] } = useMepFavorieten();
  const removeFav = useRemoveMepFavoriet();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (favorieten.length === 0) return null;

  const handleRemove = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirmId === id) {
      removeFav.mutate(id);
      setConfirmId(null);
    } else {
      setConfirmId(id);
      setTimeout(() => setConfirmId(null), 3000);
    }
  };

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
      <Star className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
      {favorieten.map((fav) => (
        <button
          key={fav.id}
          onClick={() => onSelect(fav)}
          disabled={isPending || removeFav.isPending}
          className={cn(
            "group relative flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent whitespace-nowrap flex-shrink-0",
            confirmId === fav.id && "border-destructive/50"
          )}
        >
          <span>{fav.title}</span>
          <span
            role="button"
            onClick={(e) => handleRemove(e, fav.id)}
            className={cn(
              "opacity-0 group-hover:opacity-100 transition-opacity rounded-sm hover:bg-destructive/10 p-0.5",
              confirmId === fav.id && "opacity-100 text-destructive"
            )}
          >
            <X className="h-3 w-3" />
          </span>
        </button>
      ))}
    </div>
  );
}
