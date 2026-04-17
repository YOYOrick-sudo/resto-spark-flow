import { useState } from "react";
import { Package, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { useLeveranciersArtikelen } from "@/hooks/useLeveranciersArtikelen";
import { NestoBadge, NestoButton, Spinner } from "@/components/polar";
import { HandmatigArtikelKoppelenModal } from "../HandmatigArtikelKoppelenModal";

interface Props {
  ingredientId: string;
  ingredientEenheid: string;
  ingredientNaam?: string;
}

export function LeveranciersTab({
  ingredientId,
  ingredientEenheid,
  ingredientNaam = "dit ingrediënt",
}: Props) {
  const { data: artikelen, isLoading, error } = useLeveranciersArtikelen(ingredientId);
  const [modalOpen, setModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center text-sm text-destructive">
        Kon leveranciers niet laden.
      </div>
    );
  }

  if (!artikelen || artikelen.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Package className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground max-w-sm">
            Nog geen leveranciers gekoppeld voor dit ingrediënt. Koppelingen verschijnen
            automatisch bij factuur-goedkeuring, afnamelijst-import, of handmatig
            toevoegen.
          </p>
          <NestoButton
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => setModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Leverancier handmatig toevoegen
          </NestoButton>
        </div>
        <HandmatigArtikelKoppelenModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          ingredientId={ingredientId}
          ingredientNaam={ingredientNaam}
          ingredientEenheid={ingredientEenheid}
        />
      </>
    );
  }

  // Goedkoopste = eerste rij met prijs_per_eenheid (al gesorteerd ASC)
  const goedkoopsteId = artikelen.find((a) => a.prijs_per_eenheid != null)?.id;

  return (
    <>
      <div className="space-y-3">
        <div className="flex justify-end">
          <NestoButton variant="outline" size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Leverancier toevoegen
          </NestoButton>
        </div>

        {artikelen.map((art) => {
          const isGoedkoopste = art.id === goedkoopsteId && artikelen.length > 1;
          const prijsPerBasis =
            art.prijs_per_verpakking != null && art.verpakking_hoeveelheid
              ? art.prijs_per_verpakking / art.verpakking_hoeveelheid
              : art.prijs_per_eenheid;

          return (
            <div
              key={art.id}
              className="rounded-xl border border-border/40 bg-card p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-semibold text-foreground truncate">
                      {art.leveranciers?.naam ?? "Onbekende leverancier"}
                    </h4>
                    {isGoedkoopste && (
                      <NestoBadge variant="success" size="sm">
                        Goedkoopste
                      </NestoBadge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {art.artikel_nummer && (
                      <span className="font-mono">Art.nr {art.artikel_nummer}</span>
                    )}
                    {art.artikel_nummer && art.artikel_naam && <span> · </span>}
                    <span>{art.artikel_naam}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-baseline gap-2 flex-wrap">
                {art.prijs_per_verpakking != null ? (
                  <>
                    <span className="text-base font-medium tabular-nums">
                      €{art.prijs_per_verpakking.toFixed(2)}
                    </span>
                    {art.verpakking_hoeveelheid && art.verpakking_eenheid && (
                      <span className="text-xs text-muted-foreground">
                        / {art.verpakking_hoeveelheid} {art.verpakking_eenheid}
                      </span>
                    )}
                    {prijsPerBasis != null && (
                      <span className="text-xs text-muted-foreground">
                        (€{prijsPerBasis.toFixed(2)}/{ingredientEenheid})
                      </span>
                    )}
                  </>
                ) : art.prijs_per_eenheid != null ? (
                  <span className="text-base font-medium tabular-nums">
                    €{art.prijs_per_eenheid.toFixed(2)}{" "}
                    <span className="text-xs text-muted-foreground font-normal">
                      / {ingredientEenheid}
                    </span>
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">Geen prijs bekend</span>
                )}
              </div>

              {art.laatst_gesynchroniseerd && (
                <p className="text-[11px] text-muted-foreground">
                  Bijgewerkt{" "}
                  {formatDistanceToNow(new Date(art.laatst_gesynchroniseerd), {
                    addSuffix: true,
                    locale: nl,
                  })}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <HandmatigArtikelKoppelenModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        ingredientId={ingredientId}
        ingredientNaam={ingredientNaam}
        ingredientEenheid={ingredientEenheid}
      />
    </>
  );
}
