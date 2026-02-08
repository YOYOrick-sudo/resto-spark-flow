

## "Soon" badges verwijderen uit sidebar

### Samenvatting

Alle 7 "Soon" badges worden verwijderd. Niet-beschikbare items worden subtiel gedempt met `opacity-40` en `cursor-default`, zonder tekst of badges.

### Wijzigingen

**1. `src/components/layout/NestoSidebar.tsx`**

Drie plekken waar "Soon" badges staan:

- **Disabled sub-items** (regels 165-176): De `<span>` met "Soon" badge wordt verwijderd. De styling wordt `opacity-40 cursor-default` in plaats van `cursor-not-allowed`.

- **Disabled top-level items** (regels 192-203): Zelfde aanpak — "Soon" badge weg, `opacity-40 cursor-default`.

- **Support & Documentatie sectie** (regels 225-242): Beide items verliezen hun "Soon" badge, krijgen `opacity-40 cursor-default`.

Per locatie wordt de huidige code:
```tsx
// Oud
<span className="ml-auto text-[11px] font-medium px-2 py-0.5 rounded bg-[rgba(29,151,158,0.15)] text-[#1d979e]">
  Soon
</span>
```
volledig verwijderd, en de parent `div`/container krijgt `opacity-40 cursor-default` (vervangt `cursor-not-allowed`).

**2. `docs/design/NAVIGATION_CARDS.md` of `docs/design/COLOR_PALETTE.md`**

Nieuwe sectie "DISABLED NAVIGATION ITEMS" met het standaard:
- Nooit "Soon" of "Coming soon" badges
- Niet-beschikbare items: `opacity-40`, `cursor-default`
- Items met een echte pagina (beperkte functionaliteit) blijven normaal zichtbaar

### Bestanden

| Bestand | Wijziging |
|---|---|
| `src/components/layout/NestoSidebar.tsx` | 3x "Soon" badge verwijderen, opacity-40 + cursor-default toepassen |
| `docs/design/COLOR_PALETTE.md` | Sectie "DISABLED NAVIGATION ITEMS" toevoegen |

