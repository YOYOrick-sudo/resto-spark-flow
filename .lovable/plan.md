
# Enterprise gevoel doorzetten naar hele Shifts-pagina

## Wat is er nu

De **Shift overzicht** tabel heeft nu enterprise styling (clean headers, goede contrasten, rij-dividers). Maar twee andere secties op dezelfde pagina vallen uit de toon:

1. **Uitzonderingen sectie** — de exception list items en header labels gebruiken nog lichtere contrasten
2. **Live Preview panel** — headers gebruiken `text-muted-foreground/70` (te vaag), sub-labels ook

## Minimale aanpassingen per bestand

### 1. `ShiftExceptionsSection.tsx`
- Lijst header "Lijst": `text-xs font-medium text-muted-foreground` wordt `text-[11px] font-semibold text-muted-foreground uppercase tracking-wider` — matcht nu de Shift-tabel kolomkoppen
- Items count rechts: consistent houden als `text-xs text-muted-foreground`

### 2. `ExceptionListItem.tsx`
- Datum tekst: `text-sm font-medium` wordt `text-sm font-semibold text-foreground` — zelfde als shift tijden
- Scope label en tijden: `text-muted-foreground` wordt `text-foreground/70` — iets sterker, consistent met interval kolom
- Label tekst: al `font-medium`, wordt `font-semibold` voor consistentie

### 3. `ShiftsLivePreviewPanel.tsx`
- "Live Preview" header: `text-muted-foreground/70` wordt `text-muted-foreground` (volle kleur, geen 70% opacity) — op alle 3 plekken (loading, empty, main)
- "Beschikbare tijden" sub-label: `text-muted-foreground/70` wordt `text-muted-foreground`
- Footer info tekst: `text-muted-foreground/60` wordt `text-muted-foreground` — subtiel maar leesbaar

### 4. `ExceptionCalendar.tsx`
- Maand label: `text-sm font-medium` wordt `text-sm font-semibold` — iets sterker, consistent met card headers
- Weekdag headers: `text-muted-foreground font-medium` wordt `text-muted-foreground font-semibold` — matcht tabel kolomkoppen

## Samenvatting

Alle wijzigingen zijn puur contrast/font-weight aanpassingen die het Notion/Linear enterprise gevoel van de shift-tabel doortrekken naar de rest van de pagina. Geen layout of functionele wijzigingen.

| Bestand | Wijziging |
|---|---|
| `src/components/settings/shifts/exceptions/ShiftExceptionsSection.tsx` | Lijst header styling naar uppercase tracking |
| `src/components/settings/shifts/exceptions/ExceptionListItem.tsx` | Tekst contrast omhoog |
| `src/components/settings/shifts/ShiftsLivePreviewPanel.tsx` | Headers van /70 naar volle kleur |
| `src/components/settings/shifts/exceptions/ExceptionCalendar.tsx` | Font-weights omhoog |
