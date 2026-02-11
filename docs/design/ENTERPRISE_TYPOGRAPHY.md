# ENTERPRISE TYPOGRAFIE & CONTRAST

> **Referentie:** Dit document definieert de enterprise typografie- en contrastregels voor het Nesto Polar Design System. Gebaseerd op Notion, Linear en Stripe — typografie en witruimte doen het werk, niet achtergrondkleuren en zware borders.

---

## Tekst Contrast Hiërarchie (3 niveaus)

| Niveau | Tailwind | Wanneer | Voorbeelden |
|--------|---------|---------|-------------|
| **Primair (data)** | `text-foreground font-semibold` | Informatie die moet opvallen | Namen, datums, tijden, bedragen, titels |
| **Secundair (metadata)** | `text-foreground/70` | Ondersteunende context | Scope, interval, beschrijvingen, subtitels |
| **Tertiair (labels)** | `text-muted-foreground` | Structurele labels | Kolomkoppen, sub-labels, hulptekst, placeholders |

### Regels

- **Tertiair** gebruikt altijd volle `text-muted-foreground` — **nooit** met opacity modifiers (`/60`, `/70`)
- **Primair** gebruikt altijd `font-semibold` — **nooit** `font-medium` of `font-normal` voor data
- **Secundair** (`text-foreground/70`) is de enige plek waar opacity op foreground mag

---

## Tabel & Lijst Headers

### Standaard Header Styling

```tsx
className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider"
```

### Regels

| Element | Verboden | Enterprise standaard |
|---------|----------|---------------------|
| Kolomkoppen achtergrond | `bg-muted/40`, `bg-accent`, elke achtergrondkleur | **Geen achtergrond** — labels zweven boven data |
| Header tekst | `text-xs font-medium` | `text-[11px] font-semibold uppercase tracking-wider` |
| Header padding | `px-3 py-2` (rondom) | `px-2 pb-2` (alleen onderaan ruimte) |
| Separator onder header | Aparte `<div>` met `h-px bg-border` | `border-b border-border/50` op header row, of `divide-y` op container |

### Voorbeeld

```tsx
{/* ✅ Enterprise — zwevende labels */}
<div className="grid grid-cols-[1fr_80px_80px] gap-2 px-2 pb-2 border-b border-border/50">
  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Naam</span>
  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Capaciteit</span>
  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</span>
</div>

{/* ❌ Verboden — achtergrondkleur op headers */}
<div className="bg-muted/40 rounded-t-lg px-3 py-2">
  <span className="text-xs text-muted-foreground">Naam</span>
</div>
```

---

## Sectie Micro-labels (binnen cards)

Wanneer een card meerdere secties bevat, gebruik dit patroon voor sectie-labels:

```tsx
className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider"
```

Dit matcht tabel kolomkoppen en creëert een consistent "enterprise scan" patroon door de hele app.

### Voorbeeld

```tsx
<div className="space-y-3">
  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
    Configuratie
  </span>
  <div className="space-y-2">
    {/* velden */}
  </div>
</div>
```

---

## Panel Headers & Sub-labels

| Element | Verboden | Enterprise standaard |
|---------|----------|---------------------|
| Panel header | `text-muted-foreground/70` | `text-muted-foreground` (volle kleur) |
| Sub-labels | `text-muted-foreground/60` | `text-muted-foreground` |
| Footer info | `text-muted-foreground/60` | `text-muted-foreground` |

**Regel:** Binnen panels en sidebars altijd volle `text-muted-foreground`, nooit met opacity modifiers.

---

## Rij Separatie

| Verboden | Enterprise standaard |
|----------|---------------------|
| `border-b border-border` (zware borders per rij) | `divide-y divide-border/50` op container |
| Alternerende achtergrondkleuren (`even:bg-muted/20`) | Geen — witruimte scheidt rijen |
| `border-b-2` of dikke separators | `divide-border/50` (subtiel) |

---

## Hover Patroon

```tsx
className="hover:bg-accent/40 transition-colors duration-150 cursor-pointer"
```

Optioneel met subtiel left-accent:

```tsx
className="hover:bg-accent/40 hover:border-l-2 hover:border-l-primary transition-colors duration-150"
```

---

## Verboden Patronen (Samenvatting)

| Verboden | Waarom fout | Correct alternatief |
|----------|-------------|---------------------|
| `bg-muted/40` op tabel headers | Visueel gewicht, niet enterprise | Geen achtergrond, zwevende labels |
| `text-muted-foreground/70` | Te lage opacity, onleesbaar | Volle `text-muted-foreground` |
| `text-muted-foreground/60` | Te lage opacity | Volle `text-muted-foreground` |
| `font-medium` op data-waarden | Te licht, data moet opvallen | `font-semibold` voor primaire data |
| `text-xs font-medium` voor headers | Niet enterprise | `text-[11px] font-semibold uppercase tracking-wider` |
| Achtergrondkleur-wisseling per rij | Visuele ruis | Witruimte + `divide-y divide-border/50` |

---

## Gerelateerde Documentatie

- [COMPONENT_DECISION_GUIDE.md](./COMPONENT_DECISION_GUIDE.md) — Pre-build checklist en component catalogus
- [INLINE_DATA_TABLES.md](./INLINE_DATA_TABLES.md) — Inline tabel patronen
- [COLOR_PALETTE.md](./COLOR_PALETTE.md) — Kleur tokens en tekst hiërarchie
