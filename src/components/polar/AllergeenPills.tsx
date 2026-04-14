import { NestoBadge } from "./NestoBadge";

export interface AllergeenPillData {
  allergeen_id: string;
  code: string;
  naam_nl?: string;
  status: "bevat" | "kan_bevatten" | "geen" | "onbekend";
}

interface AllergeenPillsProps {
  allergenen: AllergeenPillData[];
  maxVisible?: number;
  showEmpty?: boolean;
  emptyText?: string;
}

export function AllergeenPills({
  allergenen,
  maxVisible = 4,
  showEmpty = false,
  emptyText = "—",
}: AllergeenPillsProps) {
  const relevant = allergenen.filter(
    (a) => a.status === "bevat" || a.status === "kan_bevatten"
  );

  if (relevant.length === 0) {
    return showEmpty ? (
      <span className="text-sm text-muted-foreground">{emptyText}</span>
    ) : null;
  }

  const show = relevant.slice(0, maxVisible);
  const rest = relevant.length - show.length;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {show.map((a) => (
        <NestoBadge
          key={a.allergeen_id}
          variant={a.status === "bevat" ? "error" : "warning"}
          size="sm"
        >
          {a.code}
        </NestoBadge>
      ))}
      {rest > 0 && (
        <NestoBadge variant="default" size="sm">
          +{rest}
        </NestoBadge>
      )}
    </div>
  );
}
