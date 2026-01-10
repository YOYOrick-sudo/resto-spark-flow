import { cn } from "@/lib/utils";

export interface InsightItem {
  label: string;
  value: string;
  unit?: string;
}

export interface HealthCheck {
  status: "ok" | "warning" | "error";
  message: string;
}

export interface SettingsContextPanelProps {
  insights?: InsightItem[];
  checks?: HealthCheck[];
  context?: string[];
}

export function SettingsContextPanel({
  insights,
  checks,
  context,
}: SettingsContextPanelProps) {
  if (!insights?.length && !checks?.length && !context?.length) {
    return null;
  }

  return (
    <div className="rounded-lg bg-muted/20 p-4 space-y-3">
      {insights && insights.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Operationeel
          </h4>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            {insights.map((item, i) => (
              <div key={i} className="contents">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <span className="text-sm font-medium tabular-nums text-right">
                  {item.value}{item.unit ? ` ${item.unit}` : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {insights?.length && (checks?.length || context?.length) ? (
        <div className="border-t border-border/60 my-3" />
      ) : null}

      {checks && checks.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Signalen
          </h4>
          <div className="space-y-1.5">
            {checks.map((check, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span
                  className={cn(
                    "mt-0.5 shrink-0 w-4 text-center",
                    check.status === "ok" && "text-success",
                    check.status === "warning" && "text-warning",
                    check.status === "error" && "text-destructive"
                  )}
                >
                  {check.status === "ok" && "✓"}
                  {check.status === "warning" && "⚠"}
                  {check.status === "error" && "✗"}
                </span>
                <span
                  className={cn(
                    "text-muted-foreground",
                    check.status === "error" && "text-foreground"
                  )}
                >
                  {check.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {checks?.length && context?.length ? (
        <div className="border-t border-border/60 my-3" />
      ) : null}

      {context && context.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Context
          </h4>
          <ul className="space-y-1.5">
            {context.slice(0, 2).map((item, i) => (
              <li
                key={i}
                className="text-xs text-muted-foreground leading-relaxed"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
