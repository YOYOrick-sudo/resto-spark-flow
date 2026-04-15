import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2, Send, Plus, X } from "lucide-react";
import { NestoButton } from "@/components/polar/NestoButton";
import { NestoInput } from "@/components/polar/NestoInput";
import { NestoBadge } from "@/components/polar/NestoBadge";
import { NestoModal } from "@/components/polar/NestoModal";
import { Spinner } from "@/components/polar/LoadingStates";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useBestelling } from "@/hooks/useBestellingen";
import { useVoorraadInkoopMutations } from "@/hooks/useVoorraadInkoopMutations";
import { useIngredientSearch } from "@/hooks/useIngredientSearch";
import { supabase } from "@/integrations/supabase/client";
import { nestoToast } from "@/lib/nestoToast";
import { cn } from "@/lib/utils";

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "warning" | "error" | "outline" }> = {
  concept: { label: "Concept", variant: "warning" },
  verzonden: { label: "Verzonden", variant: "default" },
  ontvangen: { label: "Ontvangen", variant: "outline" },
  geannuleerd: { label: "Geannuleerd", variant: "error" },
};

export default function BestellingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: bestelling, isLoading, refetch } = useBestelling(id ?? null);
  const mutations = useVoorraadInkoopMutations();

  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [notities, setNotities] = useState("");
  const [verwachteLeverdatum, setVerwachteLeverdatum] = useState("");

  // Add ingredient state
  const [addSearch, setAddSearch] = useState("");
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const { data: searchResults = [] } = useIngredientSearch(addSearch);

  // Inline editing state
  const [editingRegels, setEditingRegels] = useState<Map<string, { hoeveelheid: number; prijs: number | null }>>(new Map());

  // Sync from bestelling
  useState(() => {
    if (bestelling) {
      setNotities(bestelling.notities ?? "");
      setVerwachteLeverdatum(bestelling.verwachte_leverdatum ?? "");
    }
  });

  const leverancier = bestelling?.leveranciers as any;
  const regels = (bestelling?.bestelregels as any[]) ?? [];

  const subtotaal = useMemo(() => {
    return regels.reduce((sum, r) => {
      const edited = editingRegels.get(r.id);
      const hoeveelheid = edited?.hoeveelheid ?? r.bestelde_hoeveelheid;
      const prijs = edited?.prijs ?? r.prijs_per_eenheid ?? 0;
      return sum + hoeveelheid * prijs;
    }, 0);
  }, [regels, editingRegels]);

  const handleRegelUpdate = (regelId: string, field: "hoeveelheid" | "prijs", value: number) => {
    setEditingRegels((prev) => {
      const next = new Map(prev);
      const existing = next.get(regelId) ?? { hoeveelheid: 0, prijs: null };
      const regel = regels.find((r) => r.id === regelId);
      if (!next.has(regelId) && regel) {
        existing.hoeveelheid = regel.bestelde_hoeveelheid;
        existing.prijs = regel.prijs_per_eenheid;
      }
      if (field === "hoeveelheid") existing.hoeveelheid = value;
      if (field === "prijs") existing.prijs = value;
      next.set(regelId, existing);
      return next;
    });
  };

  const handleSaveRegels = async () => {
    for (const [regelId, vals] of editingRegels.entries()) {
      await supabase
        .from("bestelregels")
        .update({
          bestelde_hoeveelheid: vals.hoeveelheid,
          prijs_per_eenheid: vals.prijs,
          totaal: vals.prijs ? vals.hoeveelheid * vals.prijs : null,
        })
        .eq("id", regelId);
    }
    setEditingRegels(new Map());
    refetch();
    nestoToast.success("Bestelregels opgeslagen");
  };

  const handleDeleteRegel = async (regelId: string) => {
    await supabase.from("bestelregels").delete().eq("id", regelId);
    refetch();
  };

  const handleAddRegel = async (ig: any) => {
    if (!bestelling) return;
    await supabase.from("bestelregels").insert({
      bestelling_id: bestelling.id,
      ingredient_id: ig.id,
      bestelde_hoeveelheid: 1,
      eenheid: ig.eenheid,
      prijs_per_eenheid: ig.kostprijs ?? null,
      totaal: ig.kostprijs ?? null,
    });
    setAddSearch("");
    setShowAddDropdown(false);
    refetch();
  };

  const handleSendOrder = async () => {
    setIsSending(true);
    try {
      // Save notities & leverdatum first
      await supabase.from("bestellingen").update({
        notities: notities || null,
        verwachte_leverdatum: verwachteLeverdatum || null,
      } as any).eq("id", bestelling!.id);

      // Save any pending regel edits
      if (editingRegels.size > 0) await handleSaveRegels();

      const { data, error } = await supabase.functions.invoke("send-order-email", {
        body: { bestelling_id: bestelling!.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      nestoToast.success("Bestelling verzonden", `E-mail verstuurd naar ${data?.email ?? leverancier?.email}`);
      setSendDialogOpen(false);
      refetch();
    } catch (e: any) {
      nestoToast.error(e.message || "Verzending mislukt");
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async () => {
    if (!bestelling) return;
    await supabase.from("bestelregels").delete().eq("bestelling_id", bestelling.id);
    await supabase.from("bestellingen").delete().eq("id", bestelling.id);
    nestoToast.success("Bestelling verwijderd");
    navigate("/inkoop");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!bestelling) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate("/inkoop")} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Terug
        </button>
        <p className="text-sm text-muted-foreground">Bestelling niet gevonden.</p>
      </div>
    );
  }

  const statusInfo = STATUS_BADGES[bestelling.status] ?? STATUS_BADGES.concept;
  const isConcept = bestelling.status === "concept";
  const hasLeverancierEmail = !!leverancier?.email;

  return (
    <div className="space-y-6 max-w-[900px] mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate("/inkoop")}
        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Terug naar bestellijsten
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-h1 text-foreground">{leverancier?.naam ?? "Leverancier"}</h1>
          <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground">
            {bestelling.bestelnummer && <span>#{bestelling.bestelnummer}</span>}
            {leverancier?.contactpersoon && <span>· {leverancier.contactpersoon}</span>}
          </div>
        </div>
        <NestoBadge variant={statusInfo.variant}>{statusInfo.label}</NestoBadge>
      </div>

      {/* Leverdatum */}
      {isConcept && (
        <div>
          <label className="text-sm font-medium text-foreground block mb-1.5">Verwachte leverdatum</label>
          <input
            type="date"
            value={verwachteLeverdatum}
            onChange={(e) => setVerwachteLeverdatum(e.target.value)}
            className="h-11 rounded-button border-[1.5px] border-border bg-card px-3 text-sm text-foreground focus:!border-primary focus:outline-none focus:ring-0"
          />
        </div>
      )}

      {/* Bestelregels */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Bestelregels</h2>
          {isConcept && (
            <div className="relative">
              <NestoButton size="sm" variant="outline" onClick={() => setShowAddDropdown(!showAddDropdown)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Regel toevoegen
              </NestoButton>
              {showAddDropdown && (
                <div className="absolute z-50 right-0 top-full mt-1 w-72 bg-card border border-border rounded-lg shadow-lg">
                  <div className="p-2">
                    <NestoInput
                      placeholder="Zoek ingrediënt..."
                      value={addSearch}
                      onChange={(e) => setAddSearch(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {addSearch.length >= 2 && searchResults.length === 0 && (
                      <p className="px-3 py-2 text-sm text-muted-foreground">Geen resultaten</p>
                    )}
                    {searchResults.map((ig) => (
                      <button
                        key={ig.id}
                        onClick={() => handleAddRegel(ig)}
                        className="w-full text-left px-3 py-2 hover:bg-accent/50 text-sm flex items-center justify-between"
                      >
                        <span className="font-medium">{ig.naam}</span>
                        <span className="text-xs text-muted-foreground">{ig.eenheid}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Ingrediënt</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5 w-28">Hoeveelheid</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 w-20">Eenheid</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5 w-32">Prijs/eenheid</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5 w-24">Totaal</th>
                {isConcept && <th className="w-10" />}
              </tr>
            </thead>
            <tbody>
              {regels.map((r) => {
                const edited = editingRegels.get(r.id);
                const hoeveelheid = edited?.hoeveelheid ?? r.bestelde_hoeveelheid;
                const prijs = edited?.prijs ?? r.prijs_per_eenheid ?? 0;
                const totaal = hoeveelheid * prijs;

                return (
                  <tr key={r.id} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-2.5 text-sm font-medium text-foreground">{r.ingredienten?.naam ?? "?"}</td>
                    <td className="px-4 py-2.5 text-right">
                      {isConcept ? (
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={hoeveelheid}
                          onChange={(e) => handleRegelUpdate(r.id, "hoeveelheid", parseFloat(e.target.value) || 0)}
                          className="w-20 text-sm text-right bg-transparent border border-border/50 rounded px-2 py-1"
                        />
                      ) : (
                        <span className="text-sm tabular-nums">{hoeveelheid}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-muted-foreground">{r.eenheid}</td>
                    <td className="px-4 py-2.5 text-right">
                      {isConcept ? (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={prijs}
                          onChange={(e) => handleRegelUpdate(r.id, "prijs", parseFloat(e.target.value) || 0)}
                          className="w-24 text-sm text-right bg-transparent border border-border/50 rounded px-2 py-1"
                        />
                      ) : (
                        <span className="text-sm tabular-nums">€{prijs.toFixed(2)}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right text-sm tabular-nums font-medium">
                      €{totaal.toFixed(2)}
                    </td>
                    {isConcept && (
                      <td className="px-2 py-2.5">
                        <button
                          onClick={() => handleDeleteRegel(r.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
              {regels.length === 0 && (
                <tr>
                  <td colSpan={isConcept ? 6 : 5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Nog geen bestelregels
                  </td>
                </tr>
              )}
            </tbody>
            {regels.length > 0 && (
              <tfoot>
                <tr className="border-t border-border">
                  <td colSpan={isConcept ? 4 : 3} className="px-4 py-2.5 text-right text-sm font-medium text-muted-foreground">
                    Subtotaal
                  </td>
                  <td className="px-4 py-2.5 text-right text-sm font-semibold tabular-nums">
                    €{subtotaal.toFixed(2)}
                  </td>
                  {isConcept && <td />}
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {editingRegels.size > 0 && (
          <div className="flex justify-end mt-2">
            <NestoButton size="sm" onClick={handleSaveRegels}>Wijzigingen opslaan</NestoButton>
          </div>
        )}
      </div>

      {/* Notities */}
      {isConcept && (
        <div>
          <label className="text-sm font-medium text-foreground block mb-1.5">Notities</label>
          <textarea
            value={notities}
            onChange={(e) => setNotities(e.target.value)}
            placeholder="Optionele notities voor de leverancier..."
            rows={3}
            className="w-full rounded-button border-[1.5px] border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:!border-primary focus:outline-none focus:ring-0 resize-none"
          />
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center justify-between border-t border-border/50 pt-6">
        <div>
          {isConcept && (
            <NestoButton variant="danger" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="h-4 w-4 mr-1.5" /> Verwijderen
            </NestoButton>
          )}
        </div>
        <div>
          {isConcept && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <NestoButton
                      onClick={() => setSendDialogOpen(true)}
                      disabled={!hasLeverancierEmail || regels.length === 0}
                    >
                      <Send className="h-4 w-4 mr-1.5" /> Bestelling verzenden
                    </NestoButton>
                  </span>
                </TooltipTrigger>
                {!hasLeverancierEmail && (
                  <TooltipContent>
                    <p>Leverancier heeft geen e-mailadres</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* Send confirmation dialog */}
      <NestoModal
        open={sendDialogOpen}
        onOpenChange={setSendDialogOpen}
        title="Bestelling verzenden"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            De bestelling wordt per e-mail verzonden naar <strong>{leverancier?.email}</strong>.
          </p>
          <div className="flex justify-end gap-2">
            <NestoButton variant="outline" onClick={() => setSendDialogOpen(false)}>Annuleren</NestoButton>
            <NestoButton onClick={handleSendOrder} isLoading={isSending}>
              <Send className="h-4 w-4 mr-1.5" /> Verzenden
            </NestoButton>
          </div>
        </div>
      </NestoModal>

      {/* Delete confirmation dialog */}
      <NestoModal
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Bestelling verwijderen"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Weet je zeker dat je deze concept-bestelling wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
          </p>
          <div className="flex justify-end gap-2">
            <NestoButton variant="outline" onClick={() => setDeleteDialogOpen(false)}>Annuleren</NestoButton>
            <NestoButton variant="danger" onClick={handleDelete}>Verwijderen</NestoButton>
          </div>
        </div>
      </NestoModal>
    </div>
  );
}
