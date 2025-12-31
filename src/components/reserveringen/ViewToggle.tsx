import { List, LayoutGrid, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewType = "list" | "grid" | "calendar";

interface ViewToggleProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  className?: string;
}

const views: { id: ViewType; icon: typeof List; label: string }[] = [
  { id: "grid", icon: LayoutGrid, label: "Grid" },
  { id: "list", icon: List, label: "List" },
  { id: "calendar", icon: Calendar, label: "Calendar" },
];

export function ViewToggle({
  activeView,
  onViewChange,
  className,
}: ViewToggleProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-0.5 bg-secondary rounded-lg p-1",
        className
      )}
    >
      {views.map((view) => {
        const Icon = view.icon;
        const isActive = activeView === view.id;

        return (
          <button
            key={view.id}
            onClick={() => onViewChange(view.id)}
            className={cn(
              "p-2 rounded-md transition-all",
              isActive
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
            title={view.label}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
