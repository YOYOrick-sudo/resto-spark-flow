import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2, Plus, Search, Upload } from "lucide-react";
import { NestoButton } from "@/components/polar/NestoButton";
import { NestoInput } from "@/components/polar/NestoInput";
import { NestoBadge } from "@/components/polar/NestoBadge";
import { NestoSelect } from "@/components/polar";
import { Spinner } from "@/components/polar/LoadingStates";
import { Switch } from "@/components/ui/switch";
import { useLeverancierDetail } from "@/hooks/useLeverancierDetail";
import { useVoorraadInkoopMutations } from "@/hooks/useVoorraadInkoopMutations";
import { InlineArtikelForm } from "@/components/inkoop/InlineArtikelForm";

const typeOptions = [
  { value: "wholesaler", label: "Wholesaler" },
  { value: "lokaal", label: "Lokaal" },
  { value: "overig", label: "Overig" },
];

export default function LeverancierDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: lev, isLoading } = useLeverancierDetail(id ?? null);
  const mutations = useVoorraadInkoopMutations();

  const [addOpen, setAddOpen] = useState(false);
  const [artikelSearch, setArtikelSearch] = useState("");

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Spinner />
      </div>
    );
  }

  if (!lev) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-muted-foreground">Leverancier niet gevonden.</p>
        <NestoButton variant="ghost" onClick={() => navigate("/inkoop/leveranciers")}>
          ← Terug naar Leveranciers
        </NestoButton>
      </div>
    );
  }

  const artikelen = ((lev.leveranciers_artikelen as any[]) ?? []).filter((a: any) => {
    if (!artikelSearch) return true;
    const q = artikelSearch.toLowerCase();
    return (
      a.artikel_naam?.toLowerCase().includes(q) ||
      a.ingredienten?.naam?.toLowerCase().includes(q) ||
      a.artikel_nummer?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Back link */}
      <button
        onClick={() => navigate("/inkoop/leveranciers")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Terug naar Leveranciers
      </button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{lev.naam}</h1>
          {lev.type && (
            <NestoBadge variant="default" size="sm">
              {lev.type}
            </NestoBadge>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Actief</span>
          <Switch
            checked={lev.is_actief}
            onCheckedChange={(checked) =>
              mutations.updateLeverancier.mutate({ id: lev.id, is_actief: checked })
            }
          />
        </div>
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column – contact + koppeling */}
        <div className="space-y-6">
          {/* Contact info */}
          <div className="rounded-xl border border-border/50 bg-card p-5 space-y-4">
            <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Contactgegevens
            </h2>
            <div className="grid grid-cols-1 gap-3 text-sm">
              {lev.contactpersoon && (
                <div>
                  <span className="text-muted-foreground text-xs">Contactpersoon</span>
                  <p className="font-medium mt-0.5">{lev.contactpersoon}</p>
                </div>
              )}
              {lev.email && (
                <div>
                  <span className="text-muted-foreground text-xs">Email</span>
                  <p className="font-medium mt-0.5">{lev.email}</p>
                </div>
              )}
              {lev.telefoon && (
                <div>
                  <span className="text-muted-foreground text-xs">Telefoon</span>
                  <p className="font-medium mt-0.5">{lev.telefoon}</p>
                </div>
              )}
              {lev.klantnummer && (
                <div>
                  <span className="text-muted-foreground text-xs">Klantnummer</span>
                  <p className="font-medium mt-0.5">{lev.klantnummer}</p>
                </div>
              )}
              {!lev.contactpersoon && !lev.email && !lev.telefoon && !lev.klantnummer && (
                <p className="text-muted-foreground text-sm">Geen contactgegevens ingevuld.</p>
              )}
            </div>
          </div>

          {/* Koppeling type */}
          <div className="rounded-xl border border-border/50 bg-card p-5 space-y-3">
            <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Koppeling
            </h2>
            <NestoSelect
              value={(lev as any).koppeling_type ?? "handmatig"}
              onValueChange={(v) =>
                mutations.updateLeverancier.mutate({ id: lev.id, koppeling_type: v })
              }
              options={[
                { value: "handmatig", label: "Handmatig" },
                { value: "api", label: "API koppeling (binnenkort)" },
              ]}
            />
            <p className="text-xs text-muted-foreground">
              {((lev as any).koppeling_type ?? "handmatig") === "handmatig"
                ? "Prijzen worden bijgewerkt via factuur-upload of email forward"
                : "Binnenkort beschikbaar"}
            </p>
          </div>

          {/* Notities */}
          {lev.notities && (
            <div className="rounded-xl border border-border/50 bg-card p-5 space-y-3">
              <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Notities
              </h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{lev.notities}</p>
            </div>
          )}
        </div>

        {/* Right column – artikelen */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border/50 bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Artikelen ({(lev.leveranciers_artikelen as any[])?.length ?? 0})
              </h2>
              <div className="flex items-center gap-2">
                <NestoButton
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/inkoop/leveranciers/${id}/import`)}
                >
                  <Upload className="h-3.5 w-3.5 mr-1" /> Afnamelijst importeren
                </NestoButton>
                {!addOpen && (
                  <NestoButton variant="ghost" size="sm" onClick={() => setAddOpen(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Toevoegen
                  </NestoButton>
                )}
              </div>
            </div>

            {/* Search bar */}
            {((lev.leveranciers_artikelen as any[])?.length ?? 0) > 5 && (
              <NestoInput
                placeholder="Zoek artikelen..."
                value={artikelSearch}
                onChange={(e) => setArtikelSearch(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
            )}

            {/* Inline add form */}
            {addOpen && (
              <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
                <InlineArtikelForm
                  leverancierId={lev.id}
                  onDone={() => setAddOpen(false)}
                />
              </div>
            )}

            {/* Artikelen list */}
            <div className="space-y-2">
              {artikelen.map((a: any) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-muted/30 border border-border/30"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{a.artikel_naam}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.ingredienten?.naam} · {a.artikel_nummer ?? "Geen nr."} ·{" "}
                      {a.verpakking_hoeveelheid
                        ? `${a.verpakking_hoeveelheid} ${a.verpakking_eenheid ?? ""}`
                        : "-"}{" "}
                      ·{" "}
                      {a.prijs_per_verpakking != null
                        ? `€${a.prijs_per_verpakking.toFixed(2)}`
                        : "-"}
                    </p>
                  </div>
                  <button
                    onClick={() => mutations.deleteArtikel.mutate(a.id)}
                    className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted/50 text-muted-foreground hover:text-destructive transition-colors duration-150 shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {artikelen.length === 0 && !addOpen && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {artikelSearch
                    ? "Geen artikelen gevonden voor deze zoekopdracht."
                    : "Nog geen artikelen gekoppeld."}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
