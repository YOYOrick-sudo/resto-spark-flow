

# FieldHelp icoon herstellen bij Communicatie-link

## Wat verandert

De FieldHelp met (i)-icoon naast "Instellingen → Communicatie" wordt teruggeplaatst. Deze was onterecht verwijderd — de tooltip geeft waardevolle context ("Logo, footer en afzendernaam worden centraal beheerd en gelden voor alle modules") die de link zelf niet communiceert.

De InfoAlert banner blijft verwijderd en de inline tekstregel "X van 9 templates ingevuld" blijft staan. Dat was correct.

## Wijziging

| Bestand | Wat |
|---------|-----|
| `src/components/onboarding/settings/EmailTemplatesSection.tsx` | `FieldHelp` import herstellen; (i)-icoon + tooltip terugplaatsen naast de link; `flex items-center gap-1` terug op de `<p>` |

### Concreet resultaat

```
Email branding en afzender instellen via Instellingen → Communicatie (i)

3 van 9 templates ingevuld

[template cards...]
```

Tooltip bij hover op (i): "Logo, footer en afzendernaam worden centraal beheerd en gelden voor alle modules."

