import { useState, useMemo } from "react";
import { DataTable, NestoBadge, NestoDatePicker, dateFromString, dateToString } from "@/components/polar";
import { useWasteRegistraties, WasteDateRange } from "@/hooks/useWasteRegistraties";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format, startOfWeek, endOfWeek } from "date-fns";
import type { DataTableColumn } from "@/components/polar";

const categorieVariant: Record<string, "error" | "warning" | "default" | "primary"> = {
  bederf: "error",
  overproductie: "warning",
  bereidingsfout: "warning",
  schilafval: "default",
  retour: "primary",
  overig: "default",
};

export function WasteOverzicht() {
  const [dateRange, setDateRange] = useState<WasteDateRange>({
    from: format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"),
    to: format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"),
  });

  const { data: registraties, isLoading } = useWasteRegistraties(dateRange);

  const totaalKosten = useMemo(
    () => (registraties ?? []).reduce((s, r) => s + (r.geschatte_kosten ?? 0), 0),
    [registraties]
  );

  const chartData = useMemo(() => {
    if (!registraties?.length) return [];
    const perDag = new Map<string, number>();
    registraties.forEach((r) => {
      const dag = r.waste_datum;
      perDag.set(dag, (perDag.get(dag) ?? 0) + (r.geschatte_kosten ?? 0));
    });
    return Array.from(perDag.entries())
      .map(([datum, kosten]) => ({ datum, kosten }))
      .sort((a, b) => a.datum.localeCompare(b.datum));
  }, [registraties]);

  const columns: DataTableColumn<any>[] = [
    { key: "waste_datum", header: "Datum", render: (r) => r.waste_datum },
    { key: "ingredient", header: "Ingrediënt", render: (r) => r.ingredient_naam },
    {
      key: "hoeveelheid",
      header: "Hoeveelheid",
      className: "tabular-nums",
      render: (r) => `${r.hoeveelheid} ${r.eenheid}`,
    },
    {
      key: "categorie",
      header: "Categorie",
      render: (r) => (
        <NestoBadge variant={categorieVariant[r.categorie] ?? "default"} size="sm">
          {r.categorie}
        </NestoBadge>
      ),
    },
    {
      key: "kosten",
      header: "Kosten",
      className: "text-right tabular-nums",
      render: (r) => r.geschatte_kosten != null ? `€${r.geschatte_kosten.toFixed(2)}` : "-",
    },
    { key: "medewerker", header: "Medewerker", render: (r) => r.medewerker },
  ];

  return (
    <div className="space-y-4">
      {/* Filters + totaal */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 items-end">
          <NestoDatePicker
            label="Van"
            value={dateFromString(dateRange.from)}
            onChange={(d) => setDateRange((r) => ({ ...r, from: dateToString(d) }))}
            className="w-40"
          />
          <NestoDatePicker
            label="t/m"
            value={dateFromString(dateRange.to)}
            onChange={(d) => setDateRange((r) => ({ ...r, to: dateToString(d) }))}
            className="w-40"
          />
        </div>
        <div className="text-sm">
          Totaal waste kosten:{" "}
          <span className="font-semibold tabular-nums text-error">€{totaalKosten.toFixed(2)}</span>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="rounded-2xl bg-card shadow-card p-4 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="datum" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `€${v}`} />
              <Tooltip formatter={(v: number) => [`€${v.toFixed(2)}`, "Kosten"]} />
              <Bar dataKey="kosten" fill="hsl(var(--error))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <DataTable
        columns={columns}
        data={registraties ?? []}
        keyExtractor={(r) => r.id}
        emptyMessage="Geen waste registraties in deze periode"
      />
    </div>
  );
}
