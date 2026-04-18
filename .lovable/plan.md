

## Copy-fix TakenRun.tsx

Twee tekstwijzigingen, geen styling/logica aanraken.

### Bestand
`src/pages/TakenRun.tsx`

### Wijzigingen

1. Sectie-header boven removed-blok:
   - van: `Audit — verwijderd door chef (alleen-lezen)`
   - naar: `Gearchiveerde taken`

2. Badge per removed-rij:
   - van: `Verwijderd uit template`
   - naar: `Gearchiveerd`

Amber kleur, italic titel, `border-t` scheiding en `disabled` inputs blijven ongewijzigd.

### Verificatie
Visuele check op `/taken/run/...` waar een removed item zichtbaar is — alleen de twee teksten veranderd.

