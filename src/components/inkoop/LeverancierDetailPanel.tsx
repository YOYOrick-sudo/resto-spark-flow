import { useState, useEffect } from "react";
import { NestoPanel, NestoButton, NestoSelect, NestoBadge, Spinner } from "@/components/polar";
import { useLeverancierDetail } from "@/hooks/useLeverancierDetail";
import { useVoorraadInkoopMutations } from "@/hooks/useVoorraadInkoopMutations";
import { useIngredientSearch } from "@/hooks/useIngredientSearch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Trash2, Plus, ChevronDown } from "lucide-react";

interface Props {
  mode: "create" | "detail" | null;
  leverancierId: string | null;
  onClose: () => void;
  onCreated: (id: string) => void;
}

const typeOptions = [
  { value: "wholesaler", label: "Wholesaler" },
  { value: "lokaal", label: "Lokaal" },
  { value: "overig", label: "Overig" },
];

// ── Create Form ────────────────────────────────────────────────
function CreateForm({ onCreated, onClose }: { onCreated: (id: string) => void; onClose: () => void }) {
  const mutations = useVoorraadInkoopMutations();
  const [naam, setNaam] = useState("");
  const [type, setType] = useState("");
  const [contactpersoon, setContactpersoon] = useState("");
  const [email, setEmail] = useState("");
  const [telefoon, setTelefoon] = useState("");
  const [klantnummer, setKlantnummer] = useState("");
  const [notities, setNotities] = useState("");

  const handleSubmit = () => {
    if (!naam.trim()) return;
    mutations.createLeverancier.mutate(
      {
        naam: naam.trim(),
        type: type || undefined,
        contactpersoon: contactpersoon || undefined,
        email: email || undefined,
        telefoon: telefoon || undefined,
        klantnummer: klantnummer || undefined,
        notities: notities || undefined,
      },
      {
        onSuccess: (data) => {
          onCreated(data.id);
        },
      }
    );
  };

  return (
    <div className="px-5 py-6 space-y-5">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Naam *</label>
        <Input value={naam} onChange={(e) => setNaam(e.target.value)} placeholder="Leverancier naam" />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Type</label>
        <NestoSelect options={typeOptions} value={type} onValueChange={setType} placeholder="Selecteer type" />
      </div>

      <div className="border-t border-border/50 pt-4" />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Contactpersoon</label>
          <Input value={contactpersoon} onChange={(e) => setContactpersoon(e.target.value)} placeholder="Naam" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@voorbeeld.nl" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Telefoon</label>
          <Input value={telefoon} onChange={(e) => setTelefoon(e.target.value)} placeholder="+31..." />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Klantnummer</label>
          <Input value={klantnummer} onChange={(e) => setKlantnummer(e.target.value)} placeholder="Optioneel" />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Notities</label>
        <Textarea value={notities} onChange={(e) => setNotities(e.target.value)} placeholder="Optionele notities..." rows={2} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <NestoButton variant="ghost" onClick={onClose}>Annuleren</NestoButton>
        <NestoButton
          onClick={handleSubmit}
          disabled={!naam.trim()}
          isLoading={mutations.createLeverancier.isPending}
        >
          Opslaan
        </NestoButton>
      </div>
    </div>
  );
}

// ── Inline Article Form ────────────────────────────────────────
function InlineArtikelForm({ leverancierId, onDone }: { leverancierId: string; onDone: () => void }) {
  const mutations = useVoorraadInkoopMutations();
  const [search, setSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { data: suggestions } = useIngredientSearch(search);

  const [form, setForm] = useState({
    ingredient_id: "",
    ingredient_naam: "",
    artikel_naam: "",
    artikel_nummer: "",
    ean_code: "",
    verpakking_hoeveelheid: "",
    verpakking_eenheid: "",
    prijs_per_verpakking: "",
  });

  const handleSave = () => {
    if (!form.ingredient_id || !form.artikel_naam) return;
    mutations.createArtikel.mutate(
      {
        leverancier_id: leverancierId,
        ingredient_id: form.ingredient_id,
        artikel_naam: form.artikel_naam,
        artikel_nummer: form.artikel_nummer || undefined,
        ean_code: form.ean_code || undefined,
        verpakking_hoeveelheid: form.verpakking_hoeveelheid ? Number(form.verpakking_hoeveelheid) : undefined,
        verpakking_eenheid: form.verpakking_eenheid || undefined,
        prijs_per_verpakking: form.prijs_per_verpakking ? Number(form.prijs_per_verpakking) : undefined,
      },
      {
        onSuccess: () => {
          setForm({ ingredient_id: "", ingredient_naam: "", artikel_naam: "", artikel_nummer: "", ean_code: "", verpakking_hoeveelheid: "", verpakking_eenheid: "", prijs_per_verpakking: "" });
          setSearch("");
          onDone();
        },
      }
    );
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="relative">
        <label className="text-xs text-muted-foreground mb-1 block">Ingrediënt *</label>
        {form.ingredient_id ? (
          <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-input bg-background text-sm">
            <span className="flex-1">{form.ingredient_naam}</span>
            <button type="button" onClick={() => setForm((f) => ({ ...f, ingredient_id: "", ingredient_naam: "" }))}>
              <Trash2 className="h-3 w-3 text-muted-foreground" />
            </button>
          </div>
        ) : (
          <>
            <Input value={search} onChange={(e) => { setSearch(e.target.value); setShowSuggestions(true); }} placeholder="Zoek ingrediënt..." className="h-9" />
            {showSuggestions && suggestions && suggestions.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg max-h-36 overflow-y-auto">
                {suggestions.map((s) => (
                  <button key={s.id} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 min-h-[44px]"
                    onClick={() => {
                      setForm((f) => ({ ...f, ingredient_id: s.id, ingredient_naam: s.naam, artikel_naam: f.artikel_naam || s.naam }));
                      setShowSuggestions(false);
                      setSearch("");
                    }}
                  >{s.naam}</button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Artikel naam *</label>
        <Input value={form.artikel_naam} onChange={(e) => setForm((f) => ({ ...f, artikel_naam: e.target.value }))} className="h-9" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Artikelnr.</label>
          <Input value={form.artikel_nummer} onChange={(e) => setForm((f) => ({ ...f, artikel_nummer: e.target.value }))} className="h-9" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">EAN</label>
          <Input value={form.ean_code} onChange={(e) => setForm((f) => ({ ...f, ean_code: e.target.value }))} className="h-9" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Verpakking</label>
          <Input type="number" value={form.verpakking_hoeveelheid} onChange={(e) => setForm((f) => ({ ...f, verpakking_hoeveelheid: e.target.value }))} className="h-9" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Eenheid</label>
          <Input value={form.verpakking_eenheid} onChange={(e) => setForm((f) => ({ ...f, verpakking_eenheid: e.target.value }))} className="h-9" />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-muted-foreground mb-1 block">Prijs per verpakking</label>
          <Input type="number" step="0.01" value={form.prijs_per_verpakking} onChange={(e) => setForm((f) => ({ ...f, prijs_per_verpakking: e.target.value }))} className="h-9" />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <NestoButton variant="ghost" size="sm" onClick={onDone}>Annuleren</NestoButton>
        <NestoButton size="sm" onClick={handleSave} disabled={!form.ingredient_id || !form.artikel_naam} isLoading={mutations.createArtikel.isPending}>
          Opslaan
        </NestoButton>
      </div>
    </div>
  );
}

// ── Detail View ────────────────────────────────────────────────
function DetailView({ leverancierId }: { leverancierId: string }) {
  const { data: lev, isLoading } = useLeverancierDetail(leverancierId);
  const mutations = useVoorraadInkoopMutations();
  const [addOpen, setAddOpen] = useState(false);

  if (isLoading || !lev) return <div className="flex justify-center py-12"><Spinner /></div>;

  const artikelen = (lev.leveranciers_artikelen as any[]) ?? [];

  return (
    <div className="px-5 py-6 space-y-6">
      {/* Basic info */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        {lev.type && (
          <div>
            <span className="text-muted-foreground text-xs">Type</span>
            <p className="font-medium mt-0.5"><NestoBadge variant="default" size="sm">{lev.type}</NestoBadge></p>
          </div>
        )}
        {lev.contactpersoon && (
          <div><span className="text-muted-foreground text-xs">Contact</span><p className="font-medium mt-0.5">{lev.contactpersoon}</p></div>
        )}
        {lev.email && (
          <div><span className="text-muted-foreground text-xs">Email</span><p className="font-medium mt-0.5">{lev.email}</p></div>
        )}
        {lev.telefoon && (
          <div><span className="text-muted-foreground text-xs">Telefoon</span><p className="font-medium mt-0.5">{lev.telefoon}</p></div>
        )}
        {lev.klantnummer && (
          <div><span className="text-muted-foreground text-xs">Klantnummer</span><p className="font-medium mt-0.5">{lev.klantnummer}</p></div>
        )}
      </div>

      {/* Koppeling type */}
      <div className="border-t border-border/50 pt-4">
        <NestoSelect
          label="Koppeling type"
          value={(lev as any).koppeling_type ?? "handmatig"}
          onValueChange={(v) => mutations.updateLeverancier.mutate({ id: leverancierId, koppeling_type: v })}
          options={[
            { value: "handmatig", label: "Handmatig" },
            { value: "api", label: "API koppeling (binnenkort)" },
          ]}
        />
        <p className="text-xs text-muted-foreground mt-1">
          {((lev as any).koppeling_type ?? "handmatig") === "handmatig"
            ? "Prijzen worden bijgewerkt via factuur-upload of email forward"
            : "Binnenkort beschikbaar"}
        </p>
      </div>

      {/* Artikelen section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Artikelen ({artikelen.length})
          </h3>
          {!addOpen && (
            <NestoButton variant="ghost" size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Toevoegen
            </NestoButton>
          )}
        </div>

        {addOpen && (
          <div className="rounded-xl border border-border/50 bg-muted/20 p-4 mb-3">
            <InlineArtikelForm leverancierId={leverancierId} onDone={() => setAddOpen(false)} />
          </div>
        )}

        <div className="space-y-2">
          {artikelen.map((a: any) => (
            <div key={a.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-muted/30 border border-border/30">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{a.artikel_naam}</p>
                <p className="text-xs text-muted-foreground">
                  {a.ingredienten?.naam} · {a.artikel_nummer ?? "Geen nr."} ·{" "}
                  {a.verpakking_hoeveelheid ? `${a.verpakking_hoeveelheid} ${a.verpakking_eenheid ?? ""}` : "-"} ·{" "}
                  {a.prijs_per_verpakking != null ? `€${a.prijs_per_verpakking.toFixed(2)}` : "-"}
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
            <p className="text-sm text-muted-foreground text-center py-4">Nog geen artikelen gekoppeld.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Panel ─────────────────────────────────────────────────
export function LeverancierDetailPanel({ mode, leverancierId, onClose, onCreated }: Props) {
  const { data: lev } = useLeverancierDetail(mode === "detail" ? leverancierId : null);

  if (!mode) return null;

  const title = mode === "create" ? "Nieuwe leverancier" : "Leverancier";

  return (
    <NestoPanel open={!!mode} onClose={onClose} title={title}>
      {(titleRef) => (
        <div>
          <h2 ref={titleRef} className="text-xl font-semibold px-5 pt-6 pb-2">
            {mode === "create" ? "Nieuwe leverancier" : lev?.naam ?? "…"}
          </h2>
          {mode === "create" ? (
            <CreateForm onCreated={onCreated} onClose={onClose} />
          ) : leverancierId ? (
            <DetailView leverancierId={leverancierId} />
          ) : null}
        </div>
      )}
    </NestoPanel>
  );
}
