export type ChipId = "all" | "nieuw" | "onzeker" | "gematcht" | "overig";

interface Chip {
  id: ChipId;
  label: string;
  count?: number;
}

interface Props {
  active: ChipId;
  onChange: (id: ChipId) => void;
  counts: {
    all: number;
    nieuw: number;
    onzeker: number;
    gematcht: number;
    overig: number;
  };
}

export function RegelFilterChips({ active, onChange, counts }: Props) {
  const chips: Chip[] = [
    { id: "all", label: "Alles", count: counts.all },
    { id: "nieuw", label: "Nieuw", count: counts.nieuw },
    { id: "onzeker", label: "Onzeker", count: counts.onzeker },
    { id: "gematcht", label: "Gematcht", count: counts.gematcht },
    { id: "overig", label: "Overig", count: counts.overig },
  ];

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {chips.map((c) => {
        const isActive = c.id === active;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c.id)}
            className={`px-3 h-8 rounded-full text-xs font-medium transition-colors border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              isActive
                ? "bg-foreground text-background border-foreground"
                : "bg-background text-muted-foreground border-border/60 hover:text-foreground hover:border-border"
            }`}
          >
            {c.label}
            {typeof c.count === "number" && (
              <span
                className={`ml-1.5 tabular-nums ${
                  isActive ? "opacity-80" : "text-muted-foreground/70"
                }`}
              >
                {c.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
