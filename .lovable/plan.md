

# Allergenen visueel subtieler maken

## Wijzigingen

### 1. `ComponentRow` — pills subtieler (regel 28-30)
- Gebruik `maxVisible={2}` en forceer één neutrale kleur: alle pills worden `variant="default"` (grijs) in plaats van rood/oranje
- Dit maakt ze subtiel en niet-alarmerend naast de componentnaam

### 2. Allergenen samenvatting — "automatisch berekend" info weg, geen "Bevat" label (regels 391-407)
- Verwijder het `<Info>` blok met "Automatisch berekend uit de componenten hierboven"
- Toon alleen de allergeen naam (bijv. "Melk", "Soja") zonder "· Bevat" erachter
- Houd wel het kleurverschil: `error` voor "bevat", `warning` voor "kan bevatten" — maar zonder het woord "Bevat"
- "Kan bevatten" allergenen tonen als `warning` badge met tekst "Kan bevatten: [naam]" (daar voegt het wél waarde toe)

### Bestanden
| Bestand | Actie |
|---------|-------|
| `src/components/kaartbeheer/GerechtComponentenTab.tsx` | Pills subtieler + info weg + labels vereenvoudigen |

### Visueel resultaat

**Component-rij:**
```
Kruidenboter                              🗑
1 portie · €2.00  [Melk] [Soja]  ← grijze subtiele pills
```

**Samenvatting onderaan:**
```
ALLERGENEN
[Melk] [Soja] [Kan bevatten: Noten]
```

