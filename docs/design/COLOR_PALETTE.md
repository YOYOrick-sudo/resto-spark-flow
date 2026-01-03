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
