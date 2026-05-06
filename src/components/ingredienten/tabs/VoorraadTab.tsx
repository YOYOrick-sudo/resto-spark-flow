import * as React from "react";
import { NestoButton, NestoBadge, NestoInput, NestoNumericInput, NestoModal } from "@/components/polar";
import { useVoorraadBewegingen } from "@/hooks/useIngredient";
import { useIngredientMutations } from "@/hooks/useIngredientMutations";
import { getVoorraadStatus, type IngredientRow } from "@/hooks/useIngredienten";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

const TYPE_BADGE: Record<string, { variant: "success" | "error" | "primary" | "warning" | "default"; label: string }> = {
  IN: { variant: "success", label: "IN" },
  OUT: { variant: "error", label: "UIT" },
  CORRECTIE: { variant: "primary", label: "CORRECTIE" },
  WASTE: { variant: "warning", label: "WASTE" },
  TRANSFER: { variant: "default", label: "TRANSFER" },
};

interface VoorraadTabProps {
  ingredient: IngredientRow;
}

export function VoorraadTab({ ingredient }: VoorraadTabProps) {
  const { updateIngredient, correctVoorraad } = useIngredientMutations();
  const { data: bewegingen, isLoading: bewegingenLoading } = useVoorraadBewegingen(ingredient.id);
  const [showCorrectieModal, setShowCorrectieModal] = React.useState(false);
  const [nieuweVoorraad, setNieuweVoorraad] = React.useState<number>(ingredient.voorraad);
  const [opmerking, setOpmerking] = React.useState("");
  const [minVoorraad, setMinVoorraad] = React.useState(ingredient.min_voorraad);
  const [maxVoorraad, setMaxVoorraad] = React.useState<string>(ingredient.max_voorraad?.toString() ?? "");

  React.useEffect(() => {
    setMinVoorraad(ingredient.min_voorraad);
    setMaxVoorraad(ingredient.max_voorraad?.toString() ?? "");
  }, [ingredient]);

  const status = getVoorraadStatus(ingredient.voorraad, ingredient.min_voorraad);
  const statusConfig: Record<string, { variant: "error" | "success" | "primary"; label: string }> = {
    laag: { variant: "error", label: "Laag" },
    "op-voorraad": { variant: "success", label: "Op voorraad" },
    overschot: { variant: "primary", label: "Overschot" },
  };
  const s = statusConfig[status];

  const handleSaveMinMax = () => {
    updateIngredient.mutate({
      id: ingredient.id,
      min_voorraad: minVoorraad,
      max_voorraad: maxVoorraad ? Number(maxVoorraad) : null,
    });
  };

  const handleCorrectie = () => {
    correctVoorraad.mutate(
      {
        ingredientId: ingredient.id,
        nieuweVoorraad,
        oudeVoorraad: ingredient.voorraad,
        opmerking,
      },
      {
        onSuccess: () => {
          setShowCorrectieModal(false);
          setOpmerking("");
        },
      }
    );
  };

  const minMaxChanged =
    minVoorraad !== ingredient.min_voorraad ||
    (maxVoorraad ? Number(maxVoorraad) : null) !== ingredient.max_voorraad;

  return (
    <div className="space-y-6">
      {/* Current stock */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-label text-muted-foreground mb-1">Huidige voorraad</p>
          <p className="text-3xl font-semibold tabular-nums text-foreground">
            {ingredient.voorraad}{" "}
            <span className="text-base font-normal text-muted-foreground">{ingredient.eenheid}</span>
          </p>
        </div>
        <NestoBadge variant={s.variant}>{s.label}</NestoBadge>
      </div>

      {/* Min / Max */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-2 block text-label text-muted-foreground">Minimum</label>
          <NestoNumericInput
            min={0}
            value={minVoorraad}
            onValueChange={(v) => setMinVoorraad(v ?? 0)}
            allowEmpty={false}
            fallback={0}
          />
        </div>
        <div>
          <label className="mb-2 block text-label text-muted-foreground">Maximum (optioneel)</label>
          <NestoInput
            type="number"
            min={0}
            value={maxVoorraad}
            onChange={(e) => setMaxVoorraad(e.target.value)}
            placeholder="—"
          />
        </div>
      </div>
      {minMaxChanged && (
        <NestoButton size="sm" onClick={handleSaveMinMax} isLoading={updateIngredient.isPending}>
          Opslaan
        </NestoButton>
      )}

      {/* Correctie button */}
      <NestoButton variant="outline" className="w-full" onClick={() => {
        setNieuweVoorraad(ingredient.voorraad);
        setShowCorrectieModal(true);
      }}>
        Voorraad corrigeren
      </NestoButton>

      {/* Correctie modal */}
      <NestoModal
        open={showCorrectieModal}
        onOpenChange={setShowCorrectieModal}
        title="Voorraad corrigeren"
        size="sm"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <NestoButton variant="outline" onClick={() => setShowCorrectieModal(false)}>
              Annuleren
            </NestoButton>
            <NestoButton onClick={handleCorrectie} isLoading={correctVoorraad.isPending}>
              Opslaan
            </NestoButton>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-label text-muted-foreground">
              Nieuwe voorraad ({ingredient.eenheid})
            </label>
            <NestoNumericInput
              min={0}
              value={nieuweVoorraad}
              onValueChange={(v) => setNieuweVoorraad(v ?? 0)}
              allowEmpty={false}
              fallback={0}
              autoFocus
            />
          </div>
          <div>
            <label className="mb-2 block text-label text-muted-foreground">Opmerking</label>
            <textarea
              className="w-full rounded-button border-[1.5px] border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:!border-primary resize-none"
              rows={3}
              value={opmerking}
              onChange={(e) => setOpmerking(e.target.value)}
              placeholder="Reden van correctie..."
            />
          </div>
        </div>
      </NestoModal>

      {/* Movement history */}
      <div>
        <h3 className="text-label text-muted-foreground uppercase tracking-wider mb-3">
          Laatste bewegingen
        </h3>
        {bewegingenLoading ? (
          <p className="text-sm text-muted-foreground">Laden...</p>
        ) : !bewegingen || bewegingen.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nog geen bewegingen</p>
        ) : (
          <div className="space-y-0 divide-y divide-border/50">
            {bewegingen.map((b) => {
              const cfg = TYPE_BADGE[b.type] || TYPE_BADGE.TRANSFER;
              return (
                <div key={b.id} className="flex items-center justify-between py-2.5 px-1">
                  <div className="flex items-center gap-3 min-w-0">
                    <NestoBadge variant={cfg.variant} size="sm">{cfg.label}</NestoBadge>
                    <div className="min-w-0">
                      <span className={`text-sm font-medium tabular-nums ${b.hoeveelheid >= 0 ? "text-success" : "text-destructive"}`}>
                        {b.hoeveelheid >= 0 ? "+" : ""}{b.hoeveelheid}
                      </span>
                      {b.bron && (
                        <span className="text-xs text-muted-foreground ml-2">{b.bron}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(b.created_at), "d MMM HH:mm", { locale: nl })}
                    </p>
                    {b.profiles?.name && (
                      <p className="text-xs text-muted-foreground">{b.profiles.name}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
