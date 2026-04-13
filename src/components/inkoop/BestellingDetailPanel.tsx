import { useState } from "react";
import { NestoPanel, NestoButton, NestoBadge, ConfirmDialog } from "@/components/polar";
import { useBestelling } from "@/hooks/useBestellingen";
import { useVoorraadInkoopMutations } from "@/hooks/useVoorraadInkoopMutations";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Send, Trash2, PackageCheck } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/polar";

interface Props {
  bestellingId: string | null;
  onClose: () => void;
}

export function BestellingDetailPanel({ bestellingId, onClose }: Props) {
  const { data: bestelling, isLoading } = useBestelling(bestellingId);
  const mutations = useVoorraadInkoopMutations();
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!bestellingId) return null;

  const isConcept = bestelling?.status === "concept";
  const isVerzonden = bestelling?.status === "verzonden";

  const handleVerzenden = () => {
    if (!bestelling) return;
    mutations.updateBestelling.mutate({
      id: bestelling.id,
      status: "verzonden",
      besteldatum: format(new Date(), "yyyy-MM-dd"),
    });
  };

  const handleOntvangen = () => {
    if (!bestelling) return;
    mutations.updateBestelling.mutate({
      id: bestelling.id,
      status: "ontvangen",
    });
  };

  const handleDelete = () => {
    if (!bestelling) return;
    mutations.deleteBestelling.mutate(bestelling.id, {
      onSuccess: () => {
        setDeleteOpen(false);
        onClose();
      },
    });
  };

  const handleUpdateRegel = (regelId: string, field: string, value: number) => {
    mutations.updateBestelregel.mutate({ id: regelId, [field]: value });
  };

  const handleLeverdatum = (date: Date | undefined) => {
    if (!bestelling || !date) return;
    mutations.updateBestelling.mutate({
      id: bestelling.id,
      verwachte_leverdatum: format(date, "yyyy-MM-dd"),
    });
  };

  return (
    <>
      <NestoPanel
        open={!!bestellingId}
        onClose={onClose}
        title="Bestelling"
        footer={
          <div className="flex items-center justify-end gap-3">
            {isConcept && (
              <>
                <NestoButton variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="h-4 w-4 mr-1" /> Verwijderen
                </NestoButton>
                <NestoButton
                  size="sm"
                  leftIcon={<Send className="h-4 w-4" />}
                  onClick={handleVerzenden}
                  isLoading={mutations.updateBestelling.isPending}
                >
                  Bestelling verzenden
                </NestoButton>
              </>
            )}
            {isVerzonden && (
              <NestoButton
                size="sm"
                leftIcon={<PackageCheck className="h-4 w-4" />}
                onClick={handleOntvangen}
                isLoading={mutations.updateBestelling.isPending}
              >
                Markeer als ontvangen
              </NestoButton>
            )}
          </div>
        }
      >
        {(titleRef) =>
          isLoading || !bestelling ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : (
            <div className="px-5 py-6 space-y-6">
              <h2 ref={titleRef} className="text-xl font-semibold">
                {(bestelling.leveranciers as any)?.naam}
              </h2>

              {/* Meta info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Bestelnummer</span>
                  <p className="font-medium">{bestelling.bestelnummer ?? "-"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <div className="mt-0.5">
                    <NestoBadge
                      variant={
                        bestelling.status === "concept" ? "default" :
                        bestelling.status === "verzonden" ? "primary" :
                        bestelling.status === "ontvangen" ? "success" : "error"
                      }
                      size="sm"
                    >
                      {bestelling.status}
                    </NestoBadge>
                  </div>
                </div>
                {(bestelling.leveranciers as any)?.contactpersoon && (
                  <div>
                    <span className="text-muted-foreground">Contactpersoon</span>
                    <p className="font-medium">{(bestelling.leveranciers as any).contactpersoon}</p>
                  </div>
                )}
              </div>

              {/* Verwachte leverdatum */}
              {(isConcept || isVerzonden) && (
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Verwachte leverdatum</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className={cn(
                        "flex h-10 items-center gap-2 rounded-button border border-input bg-background px-3 text-sm min-h-[44px]",
                        !bestelling.verwachte_leverdatum && "text-muted-foreground"
                      )}>
                        <CalendarIcon className="h-4 w-4" />
                        {bestelling.verwachte_leverdatum ?? "Selecteer datum"}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={bestelling.verwachte_leverdatum ? new Date(bestelling.verwachte_leverdatum) : undefined}
                        onSelect={handleLeverdatum}
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {/* Bestelregels */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Bestelregels
                </h3>
                <div className="space-y-2">
                  {(bestelling.bestelregels as any[])?.map((r: any) => (
                    <div key={r.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-muted/30 border border-border/30">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{r.ingredienten?.naam ?? "?"}</p>
                        <p className="text-xs text-muted-foreground">{r.eenheid}</p>
                      </div>
                      {isVerzonden ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            className="w-20 h-9 text-sm"
                            defaultValue={r.ontvangen_hoeveelheid ?? r.bestelde_hoeveelheid}
                            onBlur={(e) => handleUpdateRegel(r.id, "ontvangen_hoeveelheid", Number(e.target.value))}
                          />
                          <span className="text-xs text-muted-foreground">/ {r.bestelde_hoeveelheid}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {isConcept ? (
                            <Input
                              type="number"
                              className="w-20 h-9 text-sm"
                              defaultValue={r.bestelde_hoeveelheid}
                              onBlur={(e) => handleUpdateRegel(r.id, "bestelde_hoeveelheid", Number(e.target.value))}
                            />
                          ) : (
                            <span className="text-sm tabular-nums">{r.bestelde_hoeveelheid}</span>
                          )}
                          {r.totaal != null && (
                            <span className="text-sm tabular-nums text-muted-foreground">€{r.totaal.toFixed(2)}</span>
                          )}
                          {isConcept && (
                            <button
                              onClick={() => mutations.deleteBestelregel.mutate(r.id)}
                              className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted/50 text-muted-foreground hover:text-error transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Notities */}
              {(isConcept || isVerzonden) && (
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Notities</label>
                  <Textarea
                    defaultValue={bestelling.notities ?? ""}
                    placeholder="Optionele notities..."
                    onBlur={(e) =>
                      mutations.updateBestelling.mutate({ id: bestelling.id, notities: e.target.value })
                    }
                  />
                </div>
              )}
            </div>
          )
        }
      </NestoPanel>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Bestelling verwijderen"
        description="Weet je zeker dat je deze bestelling wilt verwijderen? Dit kan niet ongedaan worden gemaakt."
        confirmLabel="Verwijderen"
        onConfirm={handleDelete}
        variant="destructive"
        isLoading={mutations.deleteBestelling.isPending}
      />
    </>
  );
}
