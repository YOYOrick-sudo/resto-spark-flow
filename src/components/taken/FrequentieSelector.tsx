import * as React from "react";
import { NestoOutlineButtonGroup } from "@/components/polar/NestoOutlineButtonGroup";
import NestoDatePicker, { dateFromString, dateToString } from "@/components/polar/NestoDatePicker";
import { cn } from "@/lib/utils";
import type { Frequentie } from "@/hooks/useChecklistTemplates";

interface Props {
  frequentie: Frequentie;
  config: Record<string, any>;
  onChange: (f: Frequentie, c: Record<string, any>) => void;
}

const WEEKDAGEN = [
  { iso: 1, kort: "Ma", lang: "maandag" },
  { iso: 2, kort: "Di", lang: "dinsdag" },
  { iso: 3, kort: "Wo", lang: "woensdag" },
  { iso: 4, kort: "Do", lang: "donderdag" },
  { iso: 5, kort: "Vr", lang: "vrijdag" },
  { iso: 6, kort: "Za", lang: "zaterdag" },
  { iso: 7, kort: "Zo", lang: "zondag" },
];

const MAANDEN = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];

const FREQ_OPTIONS = [
  { value: "dagelijks", label: "Dagelijks" },
  { value: "wekelijks", label: "Wekelijks" },
  { value: "maandelijks", label: "Maandelijks" },
  { value: "kwartaal", label: "Kwartaal" },
  { value: "halfjaar", label: "Halfjaar" },
  { value: "jaarlijks", label: "Jaarlijks" },
  { value: "custom", label: "Custom" },
];

function ordinaal(n: number): string {
  if (n === 1) return "1e";
  if (n === 2) return "2e";
  if (n === 3) return "3e";
  return `${n}e`;
}

function formatDateNL(s: string | undefined | null): string {
  if (!s) return "—";
  const d = dateFromString(s);
  if (!d) return "—";
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-muted-foreground mt-2 italic">
      {children}
    </p>
  );
}

export function FrequentieSelector({ frequentie, config, onChange }: Props) {
  const handleFreq = (v: string) => {
    const f = v as Frequentie;
    const defaults: Record<Frequentie, Record<string, any>> = {
      dagelijks: {},
      wekelijks: { weekdagen: [1, 2, 3, 4, 5] },
      maandelijks: { dag_van_maand: 1 },
      kwartaal: { dag: 1 },
      halfjaar: { maand: 1, dag: 1 },
      jaarlijks: { maand: 1, dag: 1 },
      custom: { interval_dagen: 7, start_datum: new Date().toISOString().slice(0, 10) },
    };
    onChange(f, defaults[f]);
  };

  const weekdagen: number[] = Array.isArray(config.weekdagen) ? config.weekdagen : [];

  // Hint tekst per frequentie
  const renderHint = () => {
    if (frequentie === "dagelijks") {
      return <Hint>Deze taak verschijnt elke dag.</Hint>;
    }
    if (frequentie === "wekelijks") {
      const sorted = [...weekdagen].sort((a, b) => a - b);
      const namen = sorted
        .map((iso) => WEEKDAGEN.find((d) => d.iso === iso)?.lang)
        .filter(Boolean) as string[];
      const tekst =
        namen.length === 0
          ? "geen dagen gekozen"
          : namen.length === 1
          ? namen[0]
          : `${namen.slice(0, -1).join(", ")} en ${namen[namen.length - 1]}`;
      return <Hint>Deze taak verschijnt op: {tekst}.</Hint>;
    }
    if (frequentie === "maandelijks") {
      const dag = config.dag_van_maand ?? 1;
      return <Hint>Deze taak verschijnt op de {ordinaal(dag)} van elke maand.</Hint>;
    }
    if (frequentie === "kwartaal") {
      const dag = config.dag ?? 1;
      return (
        <Hint>
          Deze taak verschijnt op {dag} jan, {dag} apr, {dag} jul en {dag} okt.
        </Hint>
      );
    }
    if (frequentie === "halfjaar") {
      const m1 = config.maand ?? 1;
      const m2 = ((m1 - 1 + 6) % 12) + 1;
      const dag = config.dag ?? 1;
      return (
        <Hint>
          Deze taak verschijnt in {MAANDEN[m1 - 1]} en {MAANDEN[m2 - 1]}, op dag {dag}.
        </Hint>
      );
    }
    if (frequentie === "jaarlijks") {
      const m = config.maand ?? 1;
      const dag = config.dag ?? 1;
      return <Hint>Deze taak verschijnt jaarlijks op {dag} {MAANDEN[m - 1]}.</Hint>;
    }
    if (frequentie === "custom") {
      const interval = config.interval_dagen ?? 1;
      return (
        <Hint>
          Deze taak verschijnt vanaf {formatDateNL(config.start_datum)} elke {interval} dag
          {interval === 1 ? "" : "en"}.
        </Hint>
      );
    }
    return null;
  };

  return (
    <div className="space-y-3">
      <NestoOutlineButtonGroup
        options={FREQ_OPTIONS}
        value={frequentie}
        onChange={handleFreq}
        className="flex-wrap"
      />

      {frequentie === "wekelijks" && (
        <div>
          <div className="flex gap-2 flex-wrap">
            {WEEKDAGEN.map((d) => {
              const active = weekdagen.includes(d.iso);
              return (
                <button
                  key={d.iso}
                  type="button"
                  onClick={() => {
                    const next = active
                      ? weekdagen.filter((x) => x !== d.iso)
                      : [...weekdagen, d.iso].sort((a, b) => a - b);
                    onChange("wekelijks", { weekdagen: next });
                  }}
                  className={cn(
                    "rounded-button px-3 py-1.5 text-sm font-medium border transition",
                    active
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-card border-border text-muted-foreground hover:border-primary/50"
                  )}
                >
                  {d.kort}
                </button>
              );
            })}
          </div>
          {renderHint()}
        </div>
      )}

      {frequentie === "maandelijks" && (
        <div>
          <label className="text-sm font-medium text-foreground block mb-1">
            Dag van de maand (1-31)
          </label>
          <input
            type="number"
            min={1}
            max={31}
            value={config.dag_van_maand ?? 1}
            onChange={(e) =>
              onChange("maandelijks", { dag_van_maand: parseInt(e.target.value) || 1 })
            }
            className="w-24 rounded-button border-[1.5px] border-border bg-card px-3 py-2 text-sm focus:!border-primary focus:outline-none focus:ring-0"
          />
          {renderHint()}
        </div>
      )}

      {frequentie === "kwartaal" && (
        <div>
          <label className="text-sm font-medium text-foreground block mb-1">
            Dag van de 1e maand van elk kwartaal
          </label>
          <input
            type="number"
            min={1}
            max={31}
            value={config.dag ?? 1}
            onChange={(e) => onChange("kwartaal", { dag: parseInt(e.target.value) || 1 })}
            className="w-24 rounded-button border-[1.5px] border-border bg-card px-3 py-2 text-sm focus:!border-primary focus:outline-none focus:ring-0"
          />
          {renderHint()}
        </div>
      )}

      {(frequentie === "halfjaar" || frequentie === "jaarlijks") && (
        <div>
          <div className="flex gap-3">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">
                {frequentie === "halfjaar" ? "Eerste maand" : "Maand"}
              </label>
              <select
                value={config.maand ?? 1}
                onChange={(e) =>
                  onChange(frequentie, { ...config, maand: parseInt(e.target.value) })
                }
                className="rounded-button border-[1.5px] border-border bg-card px-3 py-2 text-sm focus:!border-primary focus:outline-none focus:ring-0"
              >
                {MAANDEN.map((m, i) => (
                  <option key={i} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Dag</label>
              <input
                type="number"
                min={1}
                max={31}
                value={config.dag ?? 1}
                onChange={(e) =>
                  onChange(frequentie, { ...config, dag: parseInt(e.target.value) || 1 })
                }
                className="w-24 rounded-button border-[1.5px] border-border bg-card px-3 py-2 text-sm focus:!border-primary focus:outline-none focus:ring-0"
              />
            </div>
          </div>
          {renderHint()}
        </div>
      )}

      {frequentie === "custom" && (
        <div>
          <div className="flex gap-3 items-end">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">
                Elke X dagen
              </label>
              <input
                type="number"
                min={1}
                value={config.interval_dagen ?? 7}
                onChange={(e) =>
                  onChange("custom", {
                    ...config,
                    interval_dagen: parseInt(e.target.value) || 1,
                  })
                }
                className="w-24 rounded-button border-[1.5px] border-border bg-card px-3 py-2 text-sm focus:!border-primary focus:outline-none focus:ring-0"
              />
            </div>
            <NestoDatePicker
              label="Startdatum"
              value={dateFromString(config.start_datum)}
              onChange={(d) =>
                onChange("custom", { ...config, start_datum: dateToString(d) })
              }
            />
          </div>
          {renderHint()}
        </div>
      )}

      {frequentie === "dagelijks" && renderHint()}
    </div>
  );
}
