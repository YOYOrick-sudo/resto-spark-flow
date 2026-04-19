
# Fase 2 — Typografie-sweep (geconcretiseerd)

## Belangrijk inzicht uit code-scan

De keuken `_shared.tsx → SectionHeader` wordt op **2 niveaus** gebruikt:
- Soms als card-header (1 per card) → mapt op **H2** (`SettingsCardHeader`)
- Soms als sub-sectie binnen één card (Inkoop/Taken hebben meerdere) → mapt op **H3** (`SettingsSectionLabel`)

We migreren correct per voorkomen: alle keuken-pagina's hebben momenteel exact 1 `SectionHeader` per card → mapt op H2. Behalve `SettingsKeukenTaken` die de 1e gebruikt buiten een card en `SettingsKeukenInkoop` heeft maar 1. Concreet: **alle huidige `SectionHeader`-aanroepen worden H2** behalve waar ze logisch in een groep horen — die markeer ik in de sweep.

Verder: 4 pagina's (AgentConfig, WhatsApp, Permissions, Gastberichten) hebben `<Icon /> + <h3>` patroon. `SettingsCardHeader` heeft nu geen `icon` slot. **Pre-step:** kleine uitbreiding met optionele `icon` prop (Lucide-component, links van titel, `text-muted-foreground h-4 w-4`).

## Bouwvolgorde

### Pre-step: `SettingsCardHeader` uitbreiden met `icon` prop
- Nieuwe optionele prop `icon?: ReactNode`
- Render links van title in dezelfde flex-rij
- Backwards-compatible (geen breaking change voor bestaande PrinterSettings/Fase 1 gebruikers)

### Migratie per pagina (12 bestanden)

| Bestand | Variant | Doel |
|---|---|---|
| `OptionSettingsCard.tsx` | text-lg + helpText | `SettingsCardHeader` met title + description + helpText |
| `CheckinSettingsCard.tsx` | text-lg + helpText | idem |
| `LocationSettingsCard.tsx` | text-lg + helpText | idem |
| `TableGroupsSection.tsx` | text-lg + helpText | idem |
| `BrandingTab.tsx` | text-sm + helpText | `SettingsCardHeader` (description meelopen waar aanwezig) |
| `AgentConfigTab.tsx` | 4× text-sm + icon | `SettingsCardHeader` met `icon` prop (Bot/Clock/Globe + 1 zonder) |
| `WhatsAppTab.tsx` | 4× text-sm | `SettingsCardHeader` (4 cards, geen icons in header) |
| `GastberichtenTab.tsx` | 3× text-sm + icon | `SettingsCardHeader` met `icon` (Mail/Bell + merge fields) |
| `PermissionsTab.tsx` | text-sm + Shield icon | `SettingsCardHeader` met `icon` |
| `SettingsReserveringenWidget.tsx` | lokale `CardHeader` | Lokale component verwijderen → `SettingsCardHeader` (5× call) |
| `SettingsKeukenHaccp/Categorieen/Inkoop/Assistent.tsx` | `_shared.SectionHeader` | `SettingsCardHeader` (1 per card) |
| `SettingsKeukenTaken.tsx` | 4× `SectionHeader` | Mix: card-headers → `SettingsCardHeader`, geneste sectie-labels → `SettingsSectionLabel` |

### Cleanup
- `_shared.tsx` — `SectionHeader` markeren als `@deprecated` (niet verwijderen, andere imports nog mogelijk; krijgt facade die `SettingsCardHeader` rendert om regressies te voorkomen) **OF** clean verwijderen na alle imports gemigreerd. → Kies **clean verwijderen** (alle 5 imports zitten in scope-pagina's).

### Out-of-scope (niet aanraken)
- `ShiftWizard/.../SectionHeader.tsx` (apart wizard-component, sub-sectie binnen `bg-secondary/50` groepen — niet settings-card-header)
- `ShiftWizard` step-titles (`text-base font-semibold` — wizard-context, niet settings-card)
- `ExceptionListItem`, `ExceptionCalendar`, `BulkHolidaysModal` (geen card-headers)
- `EmptyState` headings in `WhatsAppTab` regel 99 (empty-state, geen card-header)
- Functionaliteit: alle hooks, mutations, state — onaangeraakt

## Verificatie

1. `npx tsc --noEmit` groen
2. Voor/na snippet per bestand in rapport (header-block, ±10 regels)
3. Bevestiging: 0 voorkomens van `text-lg font-medium` / `text-sm font-semibold.*h3` / `_shared.*SectionHeader` import in scope-bestanden
4. Visuele check op Permissions/AgentConfig (icoon + titel uitlijning)
5. Bevestiging: PrinterSettings (Fase 1 batch 3) blijft werken — gebruikt zijn eigen lokale `CardHeader`, scope laat die ongemoeid (mag in latere polish-pass uniform)

## Stop-en-rapport

Na Fase 2:
- Volledige bouwcode van alle 13 gewijzigde bestanden
- Header-diff tabel
- Confirmatie tsc-build
- Klaar voor goedkeuring **Fase 3 — Save-pattern sweep** (nestoToast → SettingsSaveIndicator op autosave-pagina's; toast blijft voor create/delete/bulk/send)
