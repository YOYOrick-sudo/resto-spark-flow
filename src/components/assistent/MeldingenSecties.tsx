import { useState } from "react";
import { ChefHat, CalendarDays } from "lucide-react";
import { useKeukenMeldingen, type KeukenMelding } from "@/hooks/useKeukenMeldingen";
import { useSignals } from "@/hooks/useSignals";
import { KeukenMeldingCard } from "./KeukenMeldingCard";
import { PersoneelsmaaltijdModal } from "@/components/mep/PersoneelsmaaltijdModal";
import type { LucideIcon } from "lucide-react";

interface ModuleSectie {
  key: string;
  label: string;
  icon: LucideIcon;
  meldingen: KeukenMelding[];
}

export function MeldingenSecties() {
  const keukenMeldingen = useKeukenMeldingen();
  const { signals } = useSignals();
  const [maaltijdOpen, setMaaltijdOpen] = useState(false);

  // Map reservation signals to melding format
  const reserveringMeldingen: KeukenMelding[] = signals
    .filter((s) => s.module === "reserveringen" && s.status === "active")
    .map((s) => ({
      type: s.signal_type,
      severity: s.severity === "ok" ? ("info" as const) : (s.severity as "error" | "warning" | "info"),
      titel: s.title,
      beschrijving: s.message ?? "",
      actie_label: s.action_path ? "Bekijken" : undefined,
      actie_path: s.action_path ?? undefined,
    }));

  const secties: ModuleSectie[] = [];

  if (keukenMeldingen.length > 0) {
    secties.push({ key: "keuken", label: "Keuken", icon: ChefHat, meldingen: keukenMeldingen });
  }

  if (reserveringMeldingen.length > 0) {
    secties.push({ key: "reserveringen", label: "Reserveringen", icon: CalendarDays, meldingen: reserveringMeldingen });
  }

  if (secties.length === 0) return null;

  return (
    <>
      {secties.map((sectie) => (
        <div key={sectie.key} className="space-y-3">
          <div className="flex items-center gap-2">
            <sectie.icon className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {sectie.label}
            </h3>
          </div>
          {sectie.meldingen.map((melding, idx) => (
            <KeukenMeldingCard
              key={`${sectie.key}-${melding.type}-${idx}`}
              melding={melding}
              onAction={
                melding.actie_label === "Personeelsmaaltijd bedenken"
                  ? () => setMaaltijdOpen(true)
                  : undefined
              }
            />
          ))}
        </div>
      ))}
      <PersoneelsmaaltijdModal open={maaltijdOpen} onOpenChange={setMaaltijdOpen} />
    </>
  );
}
