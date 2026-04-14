

# Keuken Instellingen — Plan

## Overzicht
De huidige `SettingsKeuken.tsx` (lege EmptyState placeholders) wordt volledig herschreven naar een functioneel instellingenscherm. Dit wordt het standaard design-patroon voor alle toekomstige settings pagina's.

## Stap 1: Database Migratie

Kolommen toevoegen aan `locations` (besteladvies_buffer_percentage bestaat al):

```sql
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS haccp_koeling_max DECIMAL(4,1) DEFAULT 7.0;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS haccp_vriezer_max DECIMAL(4,1) DEFAULT -18.0;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS haccp_kern_min DECIMAL(4,1) DEFAULT 75.0;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS haccp_warmhouden_min DECIMAL(4,1) DEFAULT 60.0;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS ingredient_categorieen JSONB DEFAULT '["Groenten","Fruit","Vlees","Vis","Zuivel","Droge waren","Kruiden","Dranken","Overig"]';
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS recept_categorieen JSONB DEFAULT '["Sauzen","Soepen","Salades","Garnituren","Desserts","Brood","Overig"]';
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS ai_bevoegdheden_keuken JSONB DEFAULT '{"prep_lijsten":"vraag_eerst","besteladvies":"vraag_eerst","interne_transfers":"uit","voorraad_waarschuwingen":"zelfstandig","haccp_waarschuwingen":"zelfstandig"}';
```

Geen extra RLS nodig — bestaande location policies (owner/manager update) dekken dit.

## Stap 2: Hook — `useKeukenSettings.ts`

Nieuw bestand `src/hooks/useKeukenSettings.ts`:
- `useKeukenSettings()`: query op `locations` voor `currentLocation.id`, selecteert de 7 nieuwe kolommen + besteladvies_buffer_percentage
- `useUpdateKeukenSettings()`: mutation die deze kolommen update op de location, met `toast.success("Keuken instellingen opgeslagen")`
- Toggles voor AI bevoegdheden auto-saven via aparte mini-mutation

## Stap 3: Pagina herschrijven — `SettingsKeuken.tsx`

Verwijdert de oude `SettingsPageLayout` + EmptyState opzet. Nieuwe structuur:

- **Breadcrumb**: Instellingen → Keuken (via bestaande `SettingsPageLayout` breadcrumb, of inline)
- **PageHeader**: "Keuken" / "Instellingen voor je keukenmodule."
- **Content container**: `max-w-[720px] mx-auto`
- **4 secties** gescheiden door `border-t border-border/50 pt-6 mt-6`
- Elke sectie header: `text-[11px] uppercase tracking-wider text-muted-foreground font-medium`
- **Opslaan knop** onderaan: disabled wanneer geen wijzigingen, primary, min-h-[44px]

De pagina behoudt de bestaande settings sidebar (links) via de route structuur die al bestaat. De `SettingsPageLayout` wrapper wordt **niet** gebruikt — in plaats daarvan wordt de content direct in de bestaande settings layout gerenderd (de sidebar is al aanwezig via de instellingen routing).

### Sectie details:
1. **Inkoop & Voorraad** — 1 number input met % suffix
2. **HACCP Temperatuur Grenzen** — 2-koloms grid, 4 number inputs met °C suffix
3. **Categorieën** — 2 sub-secties met tag/chip lijsten + add input
4. **Assistent Bevoegdheden** — 5 rijen met label + NestoSelect dropdown, HACCP locked met Lock icoon + Tooltip

### Dirty state tracking:
- `useState` voor form values, `useMemo` vergelijkt met database waarden
- `isDirty` flag bepaalt of Opslaan knop actief is
- AI bevoegdheden wijzigingen auto-saven (geen Opslaan knop nodig)

## Bestanden

| Bestand | Actie |
|---|---|
| Database migratie | 7 kolommen toevoegen aan locations |
| `src/hooks/useKeukenSettings.ts` | Nieuw |
| `src/pages/SettingsKeuken.tsx` | Volledig herschrijven |

