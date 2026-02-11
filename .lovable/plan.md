

# AssistentIcon herstellen naar herkenbaar AI-sparkle icoon

## Wat verandert

De huidige SVG-paden renderen niet goed als een herkenbaar sparkle/AI-icoon. Het icoon wordt vervangen door een clean, typisch AI-sparkle design: een grote vierpuntige ster met een kleinere vierpuntige ster rechtsboven — het universeel herkende "AI/magic" icoon (zoals Google Gemini, Notion AI, etc.).

## Aanpak

De SVG-paden in `AssistentIcon.tsx` worden vervangen door proper gedefinieerde vierpuntige sterren met scherpe punten, gebaseerd op simpele polygon-achtige paden die betrouwbaar renderen.

## Wijziging

| Bestand | Wat |
|---------|-----|
| `src/components/icons/AssistentIcon.tsx` | Twee SVG path-elementen vervangen door clean sparkle-sterren |

### Visueel resultaat

```text
        *
       /|\         *
      / | \       /|\
     /  |  \     / | \
----*   |   *---*  |  *
     \  |  /     \ | /
      \ | /       \|/
       \|/         *
        *
```

Grote ster gecentreerd + kleine ster rechtsboven — hetzelfde concept als eerder, maar met paden die correct renderen.

