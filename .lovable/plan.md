

# E-mailtemplates: InfoAlert en FieldHelp verwijderen

## Wat verandert

Twee visuele aanpassingen in `EmailTemplatesSection.tsx`:

1. **InfoAlert banner verwijderen** -- de "Templates incompleet" banner met icoon en achtergrondkleur wordt vervangen door een subtiele inline tekstregel: `"X van 9 templates ingevuld"` in `text-sm text-muted-foreground`.
2. **FieldHelp (i)-icoon verwijderen** -- het tooltipicoon naast de "Instellingen → Communicatie" link verdwijnt. De tekst en link blijven staan.

## Concreet resultaat

```
Email branding en afzender instellen via Instellingen → Communicatie

3 van 9 templates ingevuld

[template cards...]
```

Geen banner, geen icoon, geen achtergrondkleur. Puur tekst. Enterprise-waardig conform het "data IS het design" principe.

## Wijziging

| Bestand | Wat |
|---------|-----|
| `src/components/onboarding/settings/EmailTemplatesSection.tsx` | InfoAlert vervangen door `<p>` regel; FieldHelp + import verwijderen; InfoAlert import verwijderen |

### Detail

- Regel 5 (`InfoAlert` import) -- verwijderen
- Regel 6 (`FieldHelp` import) -- verwijderen
- Regel 49-57: de `<p>` met FieldHelp wordt vereenvoudigd (FieldHelp weg, rest blijft)
- Regel 59-63: `InfoAlert` blok wordt vervangen door:
  ```tsx
  <p className="text-sm text-muted-foreground">
    {configuredCount} van {TEMPLATE_ORDER.length} templates ingevuld
  </p>
  ```
- De teller wordt omgekeerd: van `unconfiguredCount` naar `configuredCount` (`TEMPLATE_ORDER.length - unconfiguredCount`) zodat de tekst positief geformuleerd is ("3 van 9 ingevuld")

