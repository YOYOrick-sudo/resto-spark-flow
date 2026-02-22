

# Horizontale streep onder Kalender header verwijderen

## Probleem

De `PageHeader` component heeft standaard een `border-b border-border` onderaan. Op de kalenderpagina is dit overbodig en storend omdat de kalender grid (in een NestoCard) al visueel gescheiden is van de header door padding en schaduw.

## Oplossing

In `ContentCalendarPage.tsx` een `className` prop meegeven aan `<PageHeader>` om de border te overrulen:

```tsx
<PageHeader
  title="Kalender"
  className="border-b-0"
  actions={...}
/>
```

Dit raakt alleen de kalenderpagina — alle andere pagina's behouden hun standaard border.

## Technische details

| Bestand | Actie |
|---------|-------|
| `src/pages/marketing/ContentCalendarPage.tsx` | Edit: voeg `className="border-b-0"` toe aan PageHeader |

Een wijziging, een regel. Geen andere bestanden geraakt.

