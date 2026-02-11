# Card Shadows & Styling

Dit document beschrijft de standaard shadow- en border-regels voor NestoCard in het hele project.

---

## Principe

Cards gebruiken **shadow als primaire visuele afbakening**, niet borders. Dit geeft een cleaner, moderner uiterlijk in lijn met het Polar.sh design system.

---

## Shadow Waarden

| Type | Waarde | Wanneer |
|------|--------|---------|
| **Base** | `0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)` | Alle top-level NestoCards |
| **Hover** | `0 4px 12px rgba(0, 0, 0, 0.08)` + `translateY(-1px)` | Hoverable cards (`hoverable` prop) |
| **Nested** | `none` | Cards binnen een andere card |

Transition: `200ms ease` op `box-shadow` en `transform`.

---

## Border Regels

| Context | Border |
|---------|--------|
| **Top-level (light)** | Geen border — shadow is voldoende |
| **Top-level (dark)** | `dark:border dark:border-border` als fallback (shadow onzichtbaar) |
| **Nested cards** | `border border-border/40` als subtiele fallback (geen shadow) |

---

## Nesting Regels

**Card-in-card nesting is NIET toegestaan.** Elke logische content-groep (bijv. een area met tafels) is één NestoCard. Gebruik geen outer NestoCard wrapper rond meerdere inner cards.

### ✅ Correct
```tsx
{areas.map(area => (
  <NestoCard key={area.id} className="p-6">
    <h3>{area.name}</h3>
    {/* Tafels direct in deze card */}
  </NestoCard>
))}
```

### ❌ Fout
```tsx
<NestoCard className="p-6">
  {areas.map(area => (
    <NestoCard key={area.id} className="p-4">
      {/* Card-in-card: verwarrend */}
    </NestoCard>
  ))}
</NestoCard>
```

---

## Implementatie

Zie `src/components/polar/NestoCard.tsx` voor de broncode. De shadow waarden worden inline via `style` toegepast, niet via Tailwind classes.

---

## Checklist

- [ ] Geen `border` op top-level NestoCards
- [ ] Shadow is de primaire visuele afbakening
- [ ] Geen card-in-card nesting
- [ ] Nested cards gebruiken `border border-border/40` zonder shadow
- [ ] Hover shadow alleen op cards met `hoverable` prop
