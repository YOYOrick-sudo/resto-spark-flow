

# Typography Token Standaardisatie

## Overzicht
Alle hardcoded `text-[Xpx]` waarden in custom componenten vervangen door design tokens. ShadCN/UI bestanden worden niet aangepast.

## Stap 1: Ontbrekende tokens toevoegen aan `src/index.css`

Nieuwe CSS variabelen in `:root` + utility classes:

| Token | Size | Line-height | Weight | Letter-spacing | Gebruik |
|-------|------|-------------|--------|----------------|---------|
| `text-display` | 36px | 1.1 | 700 | - | Hero getallen in StatCard |
| `text-h3` | 16px | 24px | 500 | - | Sectie sub-headers |
| `text-secondary` | 14px | 20px | 400 | - | Secondaire tekst (vars bestaan al, class mist) |
| `text-caption` | 11px | 1.3 | 600 | 0.05em | Micro-labels, tabel headers, uppercase tracking |

**Opmerking over `text-caption`:** Het enterprise design system gebruikt `text-[11px] font-semibold uppercase tracking-wider` op 50+ plekken. De `text-caption` token neemt `font-weight: 600` en `letter-spacing: 0.05em` op, zodat je alleen nog `uppercase` hoeft toe te voegen. Dit voorkomt dat je 4 classes herhaalt op elke tabel header.

**Opmerking over `text-label`:** Huidige definitie mist `line-height`. Wordt aangevuld met `line-height: 18px`.

## Stap 2: Token mapping

| Hardcoded waarde | Token | Bestanden |
|------------------|-------|-----------|
| `text-[28px] font-semibold` | `text-h1` | PageHeader.tsx, DetailPageLayout.tsx |
| `text-[36px] font-bold` | `text-display` | StatCard.tsx |
| `text-[15px]` (body context) | `text-body` | NestoInput.tsx, NestoSelect.tsx, NestoTabs.tsx, PageHeader.tsx subtitle, DetailPageLayout.tsx back-link |
| `text-[14px]` | `text-secondary` | NestoTable.tsx |
| `text-[13px]` (labels/controls) | `text-small` | NestoSidebar.tsx (7x), FormSection.tsx, CategorySidebar.tsx, ConfigTabs.tsx, SectionHeader.tsx, ShiftModal.tsx, ComposeMessageModal.tsx, NestoOutlineButtonGroup.tsx, AssistantFilters.tsx, StatCard.tsx label |
| `text-[13.5px]` | `text-small` | nestoToast.tsx title |
| `text-[13px]` (toast desc) | `text-small` | nestoToast.tsx description |
| `text-[11px]` (micro-labels) | `text-caption` | NestoBadge sm, ShiftsTable.tsx, ShiftsLivePreviewPanel.tsx, SortableShiftRow.tsx, ShiftExceptionsSection.tsx, PhaseConfigCard.tsx, EmailTemplateEditor.tsx, ReminderSettingsSection.tsx, CandidateArchiveTable.tsx (5x), MessageThread.tsx, TaskTemplateList.tsx, TeamOwnersSection.tsx (3x), ReservationGridView.tsx |
| `text-[10px]` (tiny UI) | `text-caption` | NestoSidebar.tsx (cmd-K hint), SortableShiftRow.tsx (dag-dots), ReservationBlock.tsx, ReservationGridView.tsx (NU label), AssistantItemCard.tsx (2x) |

## Stap 3: Font-weight standaardisatie

De tokens nemen hun eigen weight mee. Bestaande expliciete `font-*` classes worden verwijderd waar de token het al dekt:

| Token | Ingebakken weight | Extra font-class nodig? |
|-------|-------------------|------------------------|
| `text-h1` | 600 (semibold) | Nee, verwijder `font-semibold` |
| `text-h2` | 600 (semibold) | Nee |
| `text-h3` | 500 (medium) | Nee |
| `text-display` | 700 (bold) | Nee, verwijder `font-bold` |
| `text-body` | 400 (normal) | Nee |
| `text-secondary` | 400 (normal) | Nee |
| `text-small` | 400 (normal) | Voeg `font-medium` toe waar nodig (labels) |
| `text-label` | 500 (medium) | Nee |
| `text-caption` | 600 (semibold) | Nee, verwijder `font-semibold` |

## Stap 4: Bestanden overzicht

### Gewijzigd (1 CSS + ~30 componenten)

**CSS:**
- `src/index.css` — 4 nieuwe variabelen + 4 nieuwe utility classes + text-label fix

**Polar componenten (11):**
- `PageHeader.tsx`, `DetailPageLayout.tsx`, `StatCard.tsx`, `NestoInput.tsx`, `NestoSelect.tsx`, `NestoTabs.tsx`, `NestoTable.tsx`, `NestoBadge.tsx`, `NestoOutlineButtonGroup.tsx`, `FormSection.tsx`, `CategorySidebar.tsx`

**Layout (1):**
- `NestoSidebar.tsx`

**Settings (7):**
- `ShiftModal.tsx`, `ShiftsTable.tsx`, `ShiftsLivePreviewPanel.tsx`, `SortableShiftRow.tsx`, `ShiftExceptionsSection.tsx`, `ConfigTabs.tsx`, `SectionHeader.tsx`

**Onboarding (7):**
- `PhaseConfigCard.tsx`, `EmailTemplateEditor.tsx`, `ReminderSettingsSection.tsx`, `CandidateArchiveTable.tsx`, `MessageThread.tsx`, `TaskTemplateList.tsx`, `TeamOwnersSection.tsx`, `ComposeMessageModal.tsx`

**Reserveringen (3):**
- `ReservationBlock.tsx`, `ReservationGridView.tsx`, `ReservationListView.tsx`

**Assistent (2):**
- `AssistantFilters.tsx`, `AssistantItemCard.tsx`

**Utilities (1):**
- `nestoToast.tsx`

### NIET gewijzigd
- Alle `src/components/ui/` bestanden (shadcn) — bewust uitgesloten
- `src/components/layout/CommandPalette.tsx` (shadcn command wrapper)

## Validatie
Na afloop: `grep -r "text-\[" src/ --include="*.tsx" | grep -v "src/components/ui/"` mag alleen resultaten tonen voor:
- `border-[1.5px]` (geen font-size)
- `py-[5px]`, `w-[18px]` etc. (spacing, niet typography)
- Geen `text-[Xpx]` meer in custom componenten

