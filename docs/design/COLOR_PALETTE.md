# 🎨 NESTO COLOR PALETTE

---

## **PRIMARY COLORS**

| Name | HEX | HSL | CSS Variable | Gebruik |
|------|-----|-----|--------------|---------|
| **Primary** | `#1d979e` | `183 70% 37%` | `--primary` | Main brand color, CTAs, links |
| **Primary Hover** | `#2BB4BC` | `183 63% 45%` | `--primary-hover` | Button hover states |
| **Primary Light** | `#E6F7F8` | `180 71% 94%` | `--brand-primary-light` | Selected backgrounds |

---

## **TEXT COLORS**

| Name | HEX | HSL | CSS Variable | Gebruik |
|------|-----|-----|--------------|---------|
| **Primary** | `#17171C` | `240 11% 10%` | `--text-primary` | Headings, primary text |
| **Secondary** | `#73747B` | `220 3% 47%` | `--text-secondary` | Body text, descriptions |
| **Tertiary** | `#ACAEB3` | `220 4% 68%` | `--text-tertiary` | Placeholders, hints |

### Enterprise Tekst Hiërarchie

De 3-niveau contrast hiërarchie die in alle modules wordt aangehouden. Zie [ENTERPRISE_TYPOGRAPHY.md](./ENTERPRISE_TYPOGRAPHY.md) voor het volledige referentiedocument.

| Niveau | Tailwind | Wanneer |
|--------|---------|---------|
| **Primair (data)** | `text-foreground font-semibold` | Data die moet opvallen: namen, datums, bedragen |
| **Secundair (metadata)** | `text-foreground/70` | Ondersteunende context: scope, beschrijvingen |
| **Tertiair (labels)** | `text-muted-foreground` | Structurele labels: kolomkoppen, hulptekst |

**Verboden:** `text-muted-foreground/70`, `text-muted-foreground/60`, `font-medium` op data-waarden.

---

## **SURFACE COLORS**

| Name | HEX | HSL | CSS Variable | Gebruik |
|------|-----|-----|--------------|---------|
| **Default** | `#FFFFFF` | `0 0% 100%` | `--surface-default` | Cards, modals |
| **Subtle** | `#F4F5F6` | `210 11% 96%` | `--surface-subtle` | Page background, panels |

---

## **BORDER COLORS**

| Name | HEX | HSL | CSS Variable | Gebruik |
|------|-----|-----|--------------|---------|
| **Subtle** | `#ECEDED` | `180 4% 93%` | `--border-subtle` | Default borders |

---

## **CARD STYLING**

Cards gebruiken **geen border** maar shadow als primaire visuele afbakening. Zie `docs/design/CARD_SHADOWS.md` voor de volledige specificatie.

| Property | Waarde |
|----------|--------|
| Base shadow | `0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)` |
| Border | Geen (top-level) / `border-border/40` (nested) |

---

## **STATUS COLORS**

| Status | Color | HEX | HSL | Light BG |
|--------|-------|-----|-----|----------|
| **Success** | Green | `#10B981` | `160 84% 39%` | `#E6FBF4` |
| **Pending** | Orange | `#FF9900` | `36 100% 50%` | `#FFF7E6` |
| **Warning** | Red | `#EF4444` | `0 74% 60%` | `#FEF2F2` |
| **Error** | Red | `#EF4444` | `0 74% 60%` | `#FEF2F2` |

---

## **TAILWIND USAGE**

```tsx
// Primary colors
className="bg-primary"           // #1d979e
className="bg-primary-hover"     // #2BB4BC (NEW!)
className="text-primary"         // #1d979e
className="border-primary"       // #1d979e

// Text colors
className="text-foreground"      // Primary text
className="text-muted-foreground" // Secondary text

// Surface colors
className="bg-background"        // Page background (#F4F5F6)
className="bg-card"              // Card surface (#FFFFFF)

// Status colors
className="bg-success"           // Green
className="bg-pending"           // Orange
className="bg-destructive"       // Red

// Borders
className="border-border"        // Default border
```

---

## **CSS VARIABLES**

```css
:root {
  /* Primary */
  --primary: 183 70% 37%;        /* #1d979e */
  --primary-hover: 183 63% 45%;  /* #2BB4BC */
  --primary-foreground: 0 0% 100%;
  
  /* Text */
  --foreground: 240 11% 10%;
  --muted-foreground: 220 3% 47%;
  
  /* Surfaces */
  --background: 210 11% 96%;
  --card: 0 0% 100%;
  
  /* Border */
  --border: 180 4% 93%;
}
```

---

## **BUTTON COLORS**

| Button Type | Background | Hover | Text |
|-------------|------------|-------|------|
| Primary | `#1d979e` | `#2BB4BC` | White |
| Secondary | `#F4F5F6` | `#ECEDED` | `#17171C` |
| Danger | `#EF4444` | `#DC2626` | White |
| Ghost | Transparent | `#F4F5F6` | `#73747B` |
| Outline (selected) | `rgba(29, 151, 158, 0.1)` | - | `#1d979e` |

---

## **KRITIEKE NOTITIES**

1. **Primary kleur is TEAL, niet blauw!**
   - HEX: `#1d979e`
   - HSL: `183 70% 37%` (hue 183, niet 177!)

2. **Alle kleuren in HSL formaat**
   - CSS variables gebruiken HSL zonder `hsl()` wrapper
   - Tailwind voegt automatisch `hsl()` toe

3. **Hover state voor primary**
   - Nieuwe CSS variable: `--primary-hover`
   - Tailwind class: `hover:bg-primary-hover`

---

## **STATUS BADGE COLORS**

Reserveringsstatus badges gebruiken een teal-kleurenfamilie i.p.v. standaard Tailwind kleuren. De visuele progressie voor actieve statussen: **Confirmed** (licht teal) → **Checked in** (teal + border) → **Seated** (vollere teal). Elk niveau wordt "steviger" zodat je in een oogopslag ziet waar een gast zich bevindt.

| Status | Dot | Tekst | Achtergrond | Border | Logica |
|---|---|---|---|---|---|
| **Pending** | `#B8B5B0` (warm grijs) | `text-muted-foreground` | `bg-muted/40` | - | Neutraal, wachtend |
| **Confirmed** | `#1d979e` (nesto teal) | `text-primary` | `bg-primary/[0.08]` | - | Licht teal = bevestigd |
| **Checked in** | `#0D9488` (teal-600) | `#0F766E` | `#F0FDFA` | `#99F6E4` | Teal + border = aangekomen |
| **Seated** | `#14B8A6` (teal-500) | `text-primary` | `bg-primary/15` | - | Vollere teal = aan tafel |
| **Completed** | `#D1CCC7` (warm grijs) | `text-muted-foreground opacity-50` | - | - | Vervaagd, klaar |
| **No-show** | `#E87461` (warm koraal) | `#C4503E` | `#FEF2F0` | `#FECDC8` | Warm rood, negatief |
| **Cancelled** | geen | `text-muted-foreground line-through` | - | - | Doorgestreept, inactief |

### Design-rationale

- **Teal-tinten** voor actieve/positieve statussen (Confirmed, Checked in, Seated)
- **Warm grijs** voor neutrale statussen (Pending, Completed)
- **Warm koraalrood** voor negatieve (No-show) — zachter dan standaard rood, past beter bij teal
- Geen standaard Tailwind blauw of groen — alles voelt als één kleurenfamilie

---

## **TABLE ROW INTERACTION**

Alle klikbare tabelrijen in de app gebruiken hetzelfde hover-patroon:

| Property | Waarde | Tailwind Class |
|----------|--------|----------------|
| Hover achtergrond | `muted/30` | `hover:bg-muted/30` |
| Transitie | 150ms | `transition-colors duration-150` |
| Cursor | pointer | `cursor-pointer` |

Dit geldt voor reserveringsrijen, ingrediënten, recepten, en alle andere klikbare rijen.

---

## **DISABLED NAVIGATION ITEMS**

Niet-beschikbare menu-items worden subtiel gedempt weergegeven, zonder badges of tekst.

| Property | Waarde | Tailwind Class |
|----------|--------|----------------|
| Opacity | 40% | `opacity-40` |
| Cursor | default | `cursor-default` |
| Klikbaar | Nee | — |

### Regels

- **Nooit** "Soon", "Coming soon", of vergelijkbare badges gebruiken in navigatie
- Niet-beschikbare items: `opacity-40` + `cursor-default`
- Items met een echte pagina (beperkte functionaliteit) blijven normaal zichtbaar
- Lege waarden in tabellen worden leeg gelaten, niet gevuld met "Geen" of "N/A" badges
