
# ReservationDetailPanel overzetten naar NestoPanel

## Probleem
Het ReservationDetailPanel gebruikt het oude `DetailPanel` component, dat visueel afwijkt van het NestoPanel/PanelDemo ontwerp:

| Aspect | DetailPanel (nu) | NestoPanel (gewenst) |
|---|---|---|
| Header | Statische bar met border-b | Reveal header (Notion-stijl) |
| Achtergrond | bg-background | bg-card |
| Border-radius | Geen | rounded-l-2xl |
| Breedte | 420px | 460px (standaard) |
| Close button | In header bar | Floating top-right |
| Titel scroll | Vast in header | In content, reveal bij scrollen |

## Wijzigingen

### Bestand 1: `src/components/reservations/ReservationDetailPanel.tsx`
- Import wijzigen: `DetailPanel` wordt `NestoPanel`
- `children` aanpassen naar render-prop patroon: `(titleRef) => ...`
- De titel "Reservering" als context-label boven de gastnaam plaatsen (via `titleRef`)
- `width` prop verwijderen (default 460px)

### Bestand 2: `src/components/polar/DetailPanel.tsx`
- Verwijderen -- wordt nergens meer gebruikt na de migratie

## Technische details

De `NestoPanel` verwacht een render-prop:
```tsx
children: (titleRef: React.RefObject<HTMLHeadingElement>) => React.ReactNode
```

De content structuur wordt:
```tsx
<NestoPanel open={open} onClose={onClose} title="Reservering">
  {(titleRef) => (
    <>
      {isLoading && <Spinner />}
      {reservation && (
        <div className="divide-y divide-border/50">
          <div className="p-5">
            <h2 ref={titleRef} className="text-lg font-semibold">
              {getDisplayName(reservation)}
            </h2>
            {/* ...rest van de content */}
          </div>
        </div>
      )}
    </>
  )}
</NestoPanel>
```

## Resultaat
- Reservering detail panel wordt visueel identiek aan de +Reservering en Walk-in panels
- Reveal header met "Reservering" verschijnt bij scrollen
- Afgeronde linkerhoeken, bg-card, 460px breed
- Het oude `DetailPanel` component wordt opgeruimd
