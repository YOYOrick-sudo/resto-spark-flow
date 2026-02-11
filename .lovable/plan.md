

# Dark mode card-systeem: documentatie + componenten synchroniseren

## Probleem

De dark mode border-fix (`dark:border dark:border-border`) is alleen toegepast in `NestoCard.tsx` en deels in `CARD_SHADOWS.md`. Maar:

- Het **hoofddocument** (`ENTERPRISE_DESIGN_GUIDE.md`) vermeldt de dark mode regel niet
- De **checklist** in `CARD_SHADOWS.md` is verouderd
- **StatCard** en **FormSection** gebruiken nog `border border-border` in beide modes (geen shadow, altijd border) -- dat is inconsistent met het shadow-first principe

## Wijzigingen

### 1. `docs/design/ENTERPRISE_DESIGN_GUIDE.md` -- Sectie 4 tabel updaten

De tabel op regel 114-118 mist de dark mode border. Wordt:

| Type | Shadow | Border |
|------|--------|--------|
| Top-level (light) | `0 1px 3px ...` | Geen |
| Top-level (dark) | `0 1px 3px ...` (onzichtbaar) | `dark:border dark:border-border` |
| Hover | `0 4px 12px ...` + translateY | Geen (dark: `/80`) |
| Nested | Geen | `border border-border/40` |

### 2. `docs/design/CARD_SHADOWS.md` -- Checklist updaten

Regel 70 zegt nu "Geen border op top-level NestoCards". Wordt:

- "Geen border op top-level NestoCards **in light mode**"
- Nieuwe regel: "Dark mode gebruikt `dark:border dark:border-border` als fallback op alle top-level card-achtige componenten"

### 3. `src/components/polar/StatCard.tsx`

**Nu:** `bg-card border border-border rounded-2xl p-6` -- altijd border, geen shadow.

**Wordt:** Shadow-first benadering, border alleen in dark mode:
- Class: `bg-card rounded-2xl p-6 dark:border dark:border-border`
- Inline style: `boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)"`

### 4. `src/components/polar/FormSection.tsx`

**Nu:** `bg-card border border-border rounded-2xl p-6` -- zelfde probleem.

**Wordt:** Zelfde fix als StatCard:
- Class: `bg-card rounded-2xl p-6 dark:border dark:border-border`
- Inline style met shadow

### 5. Niet aangepast (bewust)

| Component | Reden |
|-----------|-------|
| `Reserveringen.tsx` wrapper | Content-container, geen card. Border is functioneel voor tabel-afbakening |
| `ShiftsTable.tsx` drag overlay | Tijdelijke ghost-state met `shadow-lg ring-1`. Eigen styling nodig |
| `PhaseColumn.tsx` grouping zone | Gebruikt `bg-secondary/50 border-border/40` -- correct patroon voor lanes |
| Archived secties | `bg-muted/30` -- correct patroon voor gearchiveerde zones |
| `TaskTemplateList.tsx` input | Dit is een input-veld, geen card |

## Resultaat

Na deze wijzigingen:
- Alle drie de "card-achtige" Polar-componenten (NestoCard, StatCard, FormSection) volgen hetzelfde patroon: shadow in light, border in dark
- Beide design-documenten beschrijven de dark mode regel correct
- Toekomstige componenten hebben een duidelijke referentie

## Scope

4 bestanden, minimale wijzigingen per bestand.

