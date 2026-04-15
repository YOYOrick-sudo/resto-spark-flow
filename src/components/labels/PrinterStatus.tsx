import { useEffect, useState } from "react";
import { getPrinterStatus } from "@/services/printService";
import type { PrinterConfiguratie } from "@/hooks/usePrinterConfig";
import { cn } from "@/lib/utils";

interface PrinterStatusProps {
  config: PrinterConfiguratie | null;
  className?: string;
}

export function PrinterStatus({ config, className }: PrinterStatusProps) {
  const [status, setStatus] = useState<"online" | "offline" | "unknown">("unknown");

  useEffect(() => {
    if (!config) { setStatus("unknown"); return; }
    let cancelled = false;
    getPrinterStatus(config).then((s) => { if (!cancelled) setStatus(s); });
    return () => { cancelled = true; };
  }, [config?.print_bridge_url]);

  const color =
    status === "online" ? "bg-success" :
    status === "offline" ? "bg-destructive" :
    "bg-muted-foreground/40";

  const label =
    status === "online" ? "Online" :
    status === "offline" ? "Offline" :
    "Onbekend";

  return (
    <div className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
      <span className={cn("h-2 w-2 rounded-full", color)} />
      {label}
    </div>
  );
}
