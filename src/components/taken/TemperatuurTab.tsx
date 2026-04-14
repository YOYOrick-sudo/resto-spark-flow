import { useState, useMemo } from "react";
import { useTemperatuurRegistraties } from "@/hooks/useTemperatuurRegistraties";
import { NestoButton, NestoCard, NestoCardContent, NestoSelect, NestoBadge, Spinner } from "@/components/polar";
import { Thermometer, Check, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_OPTIONS = [
  { value: "koeling", label: "Koeling" },
  { value: "vriezer", label: "Vriezer" },
  { value: "warmhouden", label: "Warmhouden" },
  { value: "kern", label: "Kern" },
  { value: "overig", label: "Overig" },
];

const TEMP_RANGES: Record<string, { min: number; max: number } | null> = {
  koeling: { min: 0, max: 7 },
  vriezer: { min: -25, max: -18 },
  warmhouden: { min: 60, max: 100 },
  kern: { min: 75, max: 100 },
  overig: null,
};

function checkRange(type: string, temp: number): boolean | null {
  const range = TEMP_RANGES[type];
  if (!range) return null;
  if (type === "vriezer") return temp <= range.max;
  if (type === "warmhouden" || type === "kern") return temp >= range.min;
  return temp >= range.min && temp <= range.max;
}

export function TemperatuurTab() {
  const { vandaag, week, locatieNamen, registreer } = useTemperatuurRegistraties();
  const [locatieNaam, setLocatieNaam] = useState("");
  const [type, setType] = useState("koeling");
  const [temperatuur, setTemperatuur] = useState("");
  const [actieBeschrijving, setActieBeschrijving] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const temp = temperatuur === "" ? null : parseFloat(temperatuur);
  const inRange = temp !== null ? checkRange(type, temp) : null;
  const actieVereist = inRange === false;

  const filteredSuggestions = useMemo(() => {
    if (!locatieNaam.trim()) return locatieNamen.data ?? [];
    return (locatieNamen.data ?? []).filter((n) =>
      n.toLowerCase().includes(locatieNaam.toLowerCase())
    );
  }, [locatieNaam, locatieNamen.data]);

  const handleSubmit = async () => {
    if (!locatieNaam.trim() || temp === null) return;
    await registreer.mutateAsync({
      locatie_naam: locatieNaam.trim(),
      type,
      temperatuur: temp,
      actie_beschrijving: actieVereist ? actieBeschrijving : undefined,
    });
    setLocatieNaam("");
    setTemperatuur("");
    setActieBeschrijving("");
  };

  const weekData = useMemo(() => {
    const items = week.data ?? [];
    const grouped = new Map<string, { total: number; count: number; outOfRange: number }>();
    items.forEach((r) => {
      const key = `${r.locatie_naam}|${r.type}`;
      const cur = grouped.get(key) ?? { total: 0, count: 0, outOfRange: 0 };
      cur.total += r.temperatuur;
      cur.count += 1;
      if (!r.in_range) cur.outOfRange += 1;
      grouped.set(key, cur);
    });
    return Array.from(grouped.entries()).map(([key, val]) => {
      const [naam, t] = key.split("|");
      return { naam, type: t, avg: (val.total / val.count).toFixed(1), count: val.count, outOfRange: val.outOfRange };
    });
  }, [week.data]);

  return (
    <div className="space-y-8">
      {/* Quick-entry formulier */}
      <NestoCard>
        <NestoCardContent className="space-y-4 py-6">
          <h3 className="font-semibold">Temperatuur registreren</h3>

          <div className="relative">
            <label className="text-sm font-medium text-muted-foreground mb-1 block">Locatie</label>
            <input
              value={locatieNaam}
              onChange={(e) => { setLocatieNaam(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="bijv. Koeling 1, Vriezer links"
              className="w-full h-11 rounded-xl border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-card border rounded-xl shadow-lg max-h-40 overflow-y-auto">
                {filteredSuggestions.map((s) => (
                  <button
                    key={s}
                    onMouseDown={() => { setLocatieNaam(s); setShowSuggestions(false); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 min-h-[44px] flex items-center"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">Type</label>
            <NestoSelect
              value={type}
              onValueChange={setType}
              options={TYPE_OPTIONS}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">Temperatuur °C</label>
            <div className="flex items-center gap-4">
              <input
                type="number"
                step="0.1"
                value={temperatuur}
                onChange={(e) => setTemperatuur(e.target.value)}
                className="h-14 w-32 text-center text-xl font-bold rounded-xl border bg-background px-3 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="°C"
              />
              {inRange !== null && (
                <div className={cn(
                  "flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-lg",
                  inRange ? "bg-success-light text-success" : "bg-error-light text-error"
                )}>
                  {inRange ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  {inRange ? "In range" : "Buiten range!"}
                </div>
              )}
            </div>
          </div>

          {actieVereist && (
            <div>
              <label className="text-sm font-medium text-error mb-1 block">Actie vereist — beschrijf de actie</label>
              <textarea
                value={actieBeschrijving}
                onChange={(e) => setActieBeschrijving(e.target.value)}
                className="w-full min-h-[80px] rounded-xl border border-error/30 bg-background p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-error"
                placeholder="Welke actie is ondernomen?"
              />
            </div>
          )}

          <NestoButton
            onClick={handleSubmit}
            disabled={!locatieNaam.trim() || temp === null}
            loading={registreer.isPending}
            className="min-h-[48px] w-full"
          >
            <Thermometer className="h-4 w-4 mr-2" />
            Registreren
          </NestoButton>
        </NestoCardContent>
      </NestoCard>

      {/* Vandaag overzicht */}
      <div className="space-y-3">
        <h3 className="font-semibold">Vandaag</h3>
        {vandaag.isLoading ? (
          <div className="flex justify-center py-6"><Spinner /></div>
        ) : (vandaag.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nog geen metingen vandaag.</p>
        ) : (
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Tijd</th>
                  <th className="text-left px-4 py-3 font-medium">Locatie</th>
                  <th className="text-left px-4 py-3 font-medium">Type</th>
                  <th className="text-right px-4 py-3 font-medium">°C</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {(vandaag.data ?? []).map((r) => (
                  <tr key={r.id} className={cn("border-t", !r.in_range && "bg-error-light")}>
                    <td className="px-4 py-3">{new Date(r.gemeten_op).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="px-4 py-3">{r.locatie_naam}</td>
                    <td className="px-4 py-3 capitalize">{r.type}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">{r.temperatuur}°C</td>
                    <td className="px-4 py-3 text-center">
                      <NestoBadge variant={r.in_range ? "success" : "error"}>
                        {r.in_range ? "OK" : "Afwijking"}
                      </NestoBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 7 dagen overzicht */}
      {weekData.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold">Laatste 7 dagen — gemiddelden</h3>
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Meetpunt</th>
                  <th className="text-left px-4 py-3 font-medium">Type</th>
                  <th className="text-right px-4 py-3 font-medium">Gem. °C</th>
                  <th className="text-right px-4 py-3 font-medium">Metingen</th>
                  <th className="text-right px-4 py-3 font-medium">Afwijkingen</th>
                </tr>
              </thead>
              <tbody>
                {weekData.map((d, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-4 py-3">{d.naam}</td>
                    <td className="px-4 py-3 capitalize">{d.type}</td>
                    <td className="px-4 py-3 text-right font-mono">{d.avg}°C</td>
                    <td className="px-4 py-3 text-right">{d.count}</td>
                    <td className="px-4 py-3 text-right">
                      {d.outOfRange > 0 ? (
                        <span className="text-error font-semibold">{d.outOfRange}</span>
                      ) : (
                        <span className="text-success">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
