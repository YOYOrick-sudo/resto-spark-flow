import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { NestoTabs, NestoTabContent, NestoButton, NestoSelect, NestoBadge, Spinner } from "@/components/polar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useGerechtDetail } from "@/hooks/useGerechtDetail";
import { useGerechtMutations } from "@/hooks/useGerechtMutations";
import { useKeukenSettings } from "@/hooks/useKeukenSettings";
import { GerechtComponentenTab } from "@/components/kaartbeheer/GerechtComponentenTab";
import { GerechtAllergenenTab } from "@/components/kaartbeheer/GerechtAllergenenTab";
import { ChevronLeft } from "lucide-react";

const DEFAULT_CATS = ["Voorgerechten", "Hoofdgerechten", "Desserts", "Bijgerechten", "Dranken", "Overig"];

const tabs = [
  { id: "componenten", label: "Componenten" },
  { id: "bereiding", label: "Bereiding" },
  { id: "allergenen", label: "Allergenen" },
];

export default function KaartbeheerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: gerecht, isLoading } = useGerechtDetail(id ?? null);
  const { updateGerecht, archiveerGerecht, toggleActief } = useGerechtMutations();
  const { data: settings } = useKeukenSettings();

  const [activeTab, setActiveTab] = useState("componenten");
  const [naam, setNaam] = useState("");
  const [categorie, setCategorie] = useState("");
  const [beschrijving, setBeschrijving] = useState("");
  const [verkoopprijs, setVerkoopprijs] = useState("");

  useEffect(() => {
    if (gerecht) {
      setNaam(gerecht.naam);
      setCategorie(gerecht.categorie);
      setBeschrijving(gerecht.beschrijving ?? "");
      setVerkoopprijs(gerecht.verkoopprijs?.toString() ?? "");
    }
  }, [gerecht?.id, gerecht?.naam, gerecht?.categorie, gerecht?.beschrijving, gerecht?.verkoopprijs]);

  const cats = ((settings as any)?.gerecht_categorieen as string[] | undefined) ?? DEFAULT_CATS;
  const catOptions = cats.map((c) => ({ value: c, label: c }));

  // Kostprijs berekeningen
  const costs = useMemo(() => {
    if (!gerecht) return { hf: 0, ing: 0, totaal: 0, marge: null as number | null, foodCost: null as number | null };
    const halffabricaten = gerecht.componenten.filter((c) => c.type === "halffabricaat");
    const ingredienten = gerecht.componenten.filter((c) => c.type === "ingredient");
    const hf = halffabricaten.reduce((s, c) => s + c.hoeveelheid * ((c.recept_totale_kostprijs ?? 0) / Math.max(c.recept_porties ?? 1, 1)), 0);
    const ing = ingredienten.reduce((s, c) => s + c.hoeveelheid * (c.ingredient_kostprijs ?? 0), 0);
    const totaal = hf + ing;
    const vkp = gerecht.verkoopprijs ?? 0;
    const marge = vkp > 0 ? ((vkp - totaal) / vkp) * 100 : null;
    const foodCost = vkp > 0 ? (totaal / vkp) * 100 : null;
    return { hf, ing, totaal, marge, foodCost };
  }, [gerecht]);

  // TipTap editor for bereidingswijze
  const bereidingDebounce = useRef<ReturnType<typeof setTimeout>>();
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Beschrijf hoe dit gerecht wordt opgemaakt..." }),
    ],
    content: gerecht?.bereidingswijze || "",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none min-h-[200px] p-4 focus:outline-none text-foreground",
      },
    },
    onUpdate: ({ editor }) => {
      if (!gerecht) return;
      if (bereidingDebounce.current) clearTimeout(bereidingDebounce.current);
      bereidingDebounce.current = setTimeout(() => {
        updateGerecht.mutate({ id: gerecht.id, bereidingswijze: editor.getHTML() });
      }, 2000);
    },
    onBlur: ({ editor }) => {
      if (!gerecht) return;
      if (bereidingDebounce.current) clearTimeout(bereidingDebounce.current);
      updateGerecht.mutate({ id: gerecht.id, bereidingswijze: editor.getHTML() });
    },
  });

  // Sync editor content when gerecht changes
  useEffect(() => {
    if (editor && gerecht?.bereidingswijze !== undefined) {
      const currentHtml = editor.getHTML();
      if (gerecht.bereidingswijze !== currentHtml) {
        editor.commands.setContent(gerecht.bereidingswijze || "");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gerecht?.id]);

  const handleSave = () => {
    if (!gerecht) return;
    updateGerecht.mutate({
      id: gerecht.id,
      naam,
      categorie,
      beschrijving: beschrijving || null,
      verkoopprijs: verkoopprijs ? parseFloat(verkoopprijs) : null,
    });
  };

  const handleArchiveer = () => {
    if (!gerecht) return;
    archiveerGerecht.mutate(gerecht.id, {
      onSuccess: () => navigate("/kaartbeheer"),
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  if (!gerecht) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-muted-foreground">Gerecht niet gevonden.</p>
        <NestoButton variant="outline" onClick={() => navigate("/kaartbeheer")} className="min-h-[44px]">
          Terug naar overzicht
        </NestoButton>
      </div>
    );
  }

  const margeVariant = costs.marge !== null ? (costs.marge > 65 ? "success" : costs.marge >= 55 ? "warning" : "error") : "default";
  const foodCostVariant = costs.foodCost !== null ? (costs.foodCost < 30 ? "success" : costs.foodCost <= 35 ? "warning" : "error") : "default";

  return (
    <div className="space-y-6">
      <Link
        to="/kaartbeheer"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] w-fit"
      >
        <ChevronLeft className="h-4 w-4" />
        <span>Kaartbeheer</span>
      </Link>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left column — tabs */}
        <div className="lg:col-span-3 space-y-5">
          <NestoTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

          <NestoTabContent value="componenten" activeValue={activeTab}>
            <GerechtComponentenTab gerecht={gerecht} />
          </NestoTabContent>

          <NestoTabContent value="bereiding" activeValue={activeTab}>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              {editor && (
                <div className="flex gap-1 p-2 border-b border-border/50">
                  <button type="button" onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`min-w-[32px] min-h-[32px] rounded-md text-sm font-bold transition-colors ${editor.isActive("bold") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"}`}>B</button>
                  <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`min-w-[32px] min-h-[32px] rounded-md text-sm italic transition-colors ${editor.isActive("italic") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"}`}>I</button>
                  <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={`min-w-[32px] min-h-[32px] rounded-md text-sm transition-colors ${editor.isActive("orderedList") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"}`}>1.</button>
                  <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={`min-w-[32px] min-h-[32px] rounded-md text-sm transition-colors ${editor.isActive("bulletList") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"}`}>•</button>
                </div>
              )}
              <EditorContent editor={editor} />
            </div>
          </NestoTabContent>

          <NestoTabContent value="allergenen" activeValue={activeTab}>
            <GerechtAllergenenTab gerechtId={gerecht.id} />
          </NestoTabContent>
        </div>

        {/* Right column — sticky sidebar */}
        <div className="lg:col-span-2 lg:sticky lg:top-6 lg:self-start space-y-4">
          {/* Card 1: Gerecht info */}
          <div className="rounded-2xl border border-border/30 bg-card p-5 space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Naam</label>
              <Input value={naam} onChange={(e) => setNaam(e.target.value)} className="h-11" />
            </div>
            <NestoSelect label="Categorie" value={categorie} onValueChange={setCategorie} options={catOptions} />
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Beschrijving</label>
              <Textarea value={beschrijving} onChange={(e) => setBeschrijving(e.target.value)} rows={3} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Verkoopprijs (€)</label>
              <Input type="number" step="0.01" value={verkoopprijs} onChange={(e) => setVerkoopprijs(e.target.value)} className="h-11" />
            </div>
            <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
              <Switch
                checked={gerecht.is_actief}
                onCheckedChange={(v) => toggleActief.mutate({ id: gerecht.id, is_actief: v })}
              />
              <span className="text-sm">Actief op menukaart</span>
            </label>
          </div>

          {/* Card 2: Kostprijs samenvatting */}
          <div className="rounded-2xl border border-border/30 bg-card p-5 space-y-2">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Kostprijs samenvatting
            </h3>
            <div className="grid grid-cols-2 gap-y-1.5 text-sm">
              <span className="text-muted-foreground">Halffabricaten</span>
              <span className="text-right">€{costs.hf.toFixed(2)}</span>
              <span className="text-muted-foreground">Ingrediënten</span>
              <span className="text-right">€{costs.ing.toFixed(2)}</span>
              <span className="font-semibold pt-1 border-t border-border/50">Totale kostprijs</span>
              <span className="font-semibold text-right pt-1 border-t border-border/50">€{costs.totaal.toFixed(2)}</span>
              <span className="text-muted-foreground">Verkoopprijs</span>
              <span className="text-right">{gerecht.verkoopprijs ? `€${gerecht.verkoopprijs.toFixed(2)}` : "—"}</span>
              <span className="text-muted-foreground">Marge</span>
              <span className="text-right">
                {costs.marge !== null ? <NestoBadge variant={margeVariant} size="sm">{costs.marge.toFixed(1)}%</NestoBadge> : "—"}
              </span>
              <span className="text-muted-foreground">Food cost</span>
              <span className="text-right">
                {costs.foodCost !== null ? <NestoBadge variant={foodCostVariant} size="sm">{costs.foodCost.toFixed(1)}%</NestoBadge> : "—"}
              </span>
            </div>
          </div>

          {/* Card 3: Acties */}
          <div className="space-y-2">
            <NestoButton onClick={handleSave} isLoading={updateGerecht.isPending} className="w-full min-h-[44px]">
              Opslaan
            </NestoButton>
            {!gerecht.is_archived && (
              <NestoButton
                variant="outline"
                onClick={handleArchiveer}
                isLoading={archiveerGerecht.isPending}
                className="w-full min-h-[44px] text-destructive hover:text-destructive"
              >
                Archiveren
              </NestoButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
