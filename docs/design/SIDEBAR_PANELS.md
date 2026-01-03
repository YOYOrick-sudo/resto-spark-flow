# Sidebar Panels & Menu Styling

Dit document beschrijft de standaard styling voor sidebar panelen en menu items in het Nesto project.

---

## Design Tokens

### CSS Variabelen (`src/index.css`)

```css
/* Selected State System */
--selected-border: 184 37% 68%;      /* #91C8CC - lichte teal border */
--selected-background: 180 50% 96%;  /* #F0FAFA - lichte aqua achtergrond */
--selected-color: 177 70% 37%;       /* Primary teal voor tekst */
```

### Tailwind Kleuren (`tailwind.config.ts`)

```ts
"selected-border": "hsl(var(--selected-border))",
"selected-bg": "hsl(var(--selected-background))",
```

---

## Sidebar Panel Container

Alle sidebar panelen (FilterSidebar, CategorySidebar, Settings menu) gebruiken dezelfde container styling:

| Property | Waarde | Tailwind Class |
|----------|--------|----------------|
| Achtergrond | #F4F5F6 (subtle gray) | `bg-secondary` |
| Border | 1.5px, border-border | `border border-border` |
| Border radius | 16px | `rounded-card` |
| Padding | 20px | `p-5` |
| Breedte | 240px | `w-60` of `w-[240px]` |

### Voorbeeld

```tsx
<aside className="w-60 bg-secondary border border-border rounded-card p-5">
  {/* content */}
</aside>
```

---

## Sidebar Titles

Titels in sidebars worden in HOOFDLETTERS weergegeven:

| Property | Waarde | Tailwind Class |
|----------|--------|----------------|
| Formaat | HOOFDLETTERS | Content zelf in caps |
| Font size | 14px | `text-sm` |
| Font weight | 600 | `font-semibold` |
| Kleur | Foreground | `text-foreground` |
| Margin bottom | 16px | `mb-4` |

### Voorbeeld

```tsx
<h4 className="text-sm font-semibold text-foreground mb-4">
  CATEGORIEËN
</h4>
```

---

## Menu Items

### Basis Styling (alle states)

| Property | Waarde | Tailwind Class |
|----------|--------|----------------|
| Padding | 12px 16px | `py-3 px-4` |
| Border radius | 12px | `rounded-dropdown` |
| Font size | 15px | `text-[15px]` |
| Border width | 1.5px | `border-[1.5px]` |
| Transition | 150ms | `transition-all duration-150` |

### Default State (niet actief)

| Property | Waarde | Tailwind Class |
|----------|--------|----------------|
| Achtergrond | Transparant | `bg-transparent` |
| Border | Transparant | `border-transparent` |
| Tekst kleur | Muted | `text-muted-foreground` |
| Hover | Accent 60% | `hover:bg-accent/60` |

### Active State (geselecteerd)

| Property | Waarde | Tailwind Class |
|----------|--------|----------------|
| Achtergrond | #F0FAFA | `bg-selected-bg` |
| Border | #91C8CC | `border-selected-border` |
| Tekst kleur | Primary teal | `text-primary` |
| Font weight | 600 (semibold) | `font-semibold` |

### Complete Class String

```tsx
// Default state
"bg-transparent border-transparent text-muted-foreground hover:bg-accent/60"

// Active state
"bg-selected-bg border-selected-border text-primary font-semibold"
```

---

## Volledige Implementatie Voorbeeld

```tsx
<button
  className={cn(
    // Basis styling
    "w-full text-left py-3 px-4 rounded-dropdown text-[15px] transition-all duration-150 border-[1.5px]",
    // Focus state
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    // Conditional state
    isActive
      ? "bg-selected-bg border-selected-border text-primary font-semibold"
      : "bg-transparent border-transparent text-muted-foreground hover:bg-accent/60"
  )}
>
  {label}
</button>
```

---

## Componenten die deze styling gebruiken

| Component | Locatie | Gebruik |
|-----------|---------|---------|
| `CategorySidebar` | `src/components/polar/CategorySidebar.tsx` | Categorie navigatie in detail pagina's |
| `SettingsPageLayout` | `src/components/polar/SettingsPageLayout.tsx` | Settings module navigatie |
| `FilterSidebar` | `src/components/polar/FilterSidebar.tsx` | Filter panelen (andere styling, zie apart) |

---

## Checklist voor nieuwe modules

Bij het bouwen van nieuwe modules met sidebar navigatie:

- [ ] Gebruik `bg-secondary` voor de sidebar container
- [ ] Gebruik `rounded-card` (16px) voor de container border radius
- [ ] Titels in HOOFDLETTERS met `text-sm font-semibold`
- [ ] Menu items met `rounded-dropdown` (12px)
- [ ] Active state: `bg-selected-bg border-selected-border text-primary font-semibold`
- [ ] Default state: `bg-transparent border-transparent text-muted-foreground`
- [ ] Hover state: `hover:bg-accent/60`
- [ ] Border width: `border-[1.5px]` voor menu items

---

## Kleur Referentie

| Naam | Hex | HSL | Gebruik |
|------|-----|-----|---------|
| Selected Background | `#F0FAFA` | `180 50% 96%` | Actief menu item achtergrond |
| Selected Border | `#91C8CC` | `184 37% 68%` | Actief menu item border |
| Primary | `#1d979e` | `183 70% 37%` | Actief menu item tekst |
| Secondary | `#F4F5F6` | - | Sidebar container achtergrond |
| Muted Foreground | `#73747B` | - | Inactief menu item tekst |
