import { useEffect, useMemo, useState } from "react";
import { SettingsDetailLayout } from "@/components/settings/layouts/SettingsDetailLayout";
import { NestoCard, NestoCardContent, NestoButton, Spinner } from "@/components/polar";
import { buildBreadcrumbs } from "@/lib/settingsRouteConfig";
import { useKeukenSettings, useUpdateKeukenSettings } from "@/hooks/useKeukenSettings";
import { nestoToast } from "@/lib/nestoToast";
import { CategoryManager } from "./_shared";
import { SettingsCardHeader, SettingsSaveIndicator, type SaveState } from "@/components/settings";

export default function SettingsKeukenCategorieen() {
  const { data: settings, isLoading } = useKeukenSettings();
  const updateSettings = useUpdateKeukenSettings();

  const [ingredientCats, setIngredientCats] = useState<string[]>([]);
  const [receptCats, setReceptCats] = useState<string[]>([]);
  const [gerechtCats, setGerechtCats] = useState<string[]>([]);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  useEffect(() => {
    if (settings) {
      setIngredientCats([...settings.ingredient_categorieen]);
      setReceptCats([...settings.recept_categorieen]);
      setGerechtCats([...settings.gerecht_categorieen]);
    }
  }, [settings]);

  const isDirty = useMemo(() => {
    if (!settings) return false;
    return (
      JSON.stringify(settings.ingredient_categorieen) !== JSON.stringify(ingredientCats) ||
      JSON.stringify(settings.recept_categorieen) !== JSON.stringify(receptCats) ||
      JSON.stringify(settings.gerecht_categorieen) !== JSON.stringify(gerechtCats)
    );
  }, [settings, ingredientCats, receptCats, gerechtCats]);

  const handleSave = async () => {
    setSaveState("saving");
    try {
      await updateSettings.mutateAsync({
        ingredient_categorieen: ingredientCats,
        recept_categorieen: receptCats,
        gerecht_categorieen: gerechtCats,
      });
      setSaveState("saved");
    } catch (e) {
      setSaveState("error");
      nestoToast.error("Opslaan mislukt", { description: e instanceof Error ? e.message : undefined });
    }
  };

  return (
    <SettingsDetailLayout
      title="Categorieën"
      description="Beheer ingrediënt-, recept- en gerechtcategorieën."
      breadcrumbs={buildBreadcrumbs("keuken", "categorieen")}
    >
      <NestoCard>
        <NestoCardContent>
          {isLoading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : (
            <>
              <SettingsCardHeader
                title="Categorieën"
                description="Voeg toe of verwijder naar behoefte. Pillen verschijnen in dropdowns bij aanmaken/bewerken."
              />
              <div className="space-y-6">
                <CategoryManager
                  label="Ingrediënt categorieën"
                  items={ingredientCats}
                  onAdd={(item) => setIngredientCats((prev) => [...prev, item])}
                  onRemove={(idx) => setIngredientCats((prev) => prev.filter((_, i) => i !== idx))}
                />
                <CategoryManager
                  label="Recept categorieën"
                  items={receptCats}
                  onAdd={(item) => setReceptCats((prev) => [...prev, item])}
                  onRemove={(idx) => setReceptCats((prev) => prev.filter((_, i) => i !== idx))}
                />
                <CategoryManager
                  label="Gerecht categorieën"
                  items={gerechtCats}
                  onAdd={(item) => setGerechtCats((prev) => [...prev, item])}
                  onRemove={(idx) => setGerechtCats((prev) => prev.filter((_, i) => i !== idx))}
                />
              </div>
              <div className="border-t border-border/50 pt-5 mt-6 flex items-center gap-3">
                <NestoButton
                  onClick={handleSave}
                  disabled={!isDirty}
                  isLoading={updateSettings.isPending}
                  className="min-h-[44px]"
                >
                  Opslaan
                </NestoButton>
                <SettingsSaveIndicator
                  state={saveState}
                  variant="inline-button"
                  onAutoFade={() => setSaveState("idle")}
                />
              </div>
            </>
          )}
        </NestoCardContent>
      </NestoCard>
    </SettingsDetailLayout>
  );
}
