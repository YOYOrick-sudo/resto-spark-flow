import { NestoButton, NestoBadge } from "@/components/polar";
import { AdviesGroep } from "@/hooks/useBesteladvies";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShoppingCart } from "lucide-react";

interface Props {
  groep: AdviesGroep;
  onMaakBestellijst: () => void;
  isCreating: boolean;
}

export function BesteladviesLeverancierGroep({ groep, onMaakBestellijst, isCreating }: Props) {
  return (
    <div className="rounded-2xl bg-card shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-foreground">{groep.leverancier_naam}</h3>
          <NestoBadge variant="default" size="sm">
            {groep.regels.length} {groep.regels.length === 1 ? "item" : "items"}
          </NestoBadge>
        </div>
        {groep.leverancier_id && (
          <NestoButton
            size="sm"
            leftIcon={<ShoppingCart className="h-3.5 w-3.5" />}
            onClick={onMaakBestellijst}
            isLoading={isCreating}
          >
            Maak bestellijst
          </NestoButton>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow className="border-none hover:bg-transparent">
            <TableHead className="px-5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ingrediënt</TableHead>
            <TableHead className="px-5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Voorraad</TableHead>
            <TableHead className="px-5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Minimum</TableHead>
            <TableHead className="px-5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Tekort</TableHead>
            <TableHead className="px-5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Advies</TableHead>
            <TableHead className="px-5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Verpakkingen</TableHead>
            <TableHead className="px-5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Prijs</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-border/50">
          {groep.regels.map((r) => (
            <TableRow key={r.ingredient_id} className="border-none hover:bg-muted/30">
              <TableCell className="px-5 py-3 text-sm font-medium">{r.ingredient_naam}</TableCell>
              <TableCell className="px-5 py-3 text-sm text-right tabular-nums">{r.voorraad} {r.eenheid}</TableCell>
              <TableCell className="px-5 py-3 text-sm text-right tabular-nums">{r.min_voorraad} {r.eenheid}</TableCell>
              <TableCell className="px-5 py-3 text-sm text-right tabular-nums text-error">{r.tekort} {r.eenheid}</TableCell>
              <TableCell className="px-5 py-3 text-sm text-right tabular-nums font-medium">{r.advies_hoeveelheid} {r.eenheid}</TableCell>
              <TableCell className="px-5 py-3 text-sm text-right tabular-nums">
                {r.aantal_verpakkingen != null ? `${r.aantal_verpakkingen}×` : "-"}
              </TableCell>
              <TableCell className="px-5 py-3 text-sm text-right tabular-nums">
                {r.geschatte_prijs != null ? `€${r.geschatte_prijs.toFixed(2)}` : "-"}
              </TableCell>
            </TableRow>
          ))}
          {groep.totaal > 0 && (
            <TableRow className="border-none bg-muted/20">
              <TableCell colSpan={6} className="px-5 py-3 text-sm font-semibold text-right">
                Totaal
              </TableCell>
              <TableCell className="px-5 py-3 text-sm font-semibold text-right tabular-nums">
                €{groep.totaal.toFixed(2)}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
