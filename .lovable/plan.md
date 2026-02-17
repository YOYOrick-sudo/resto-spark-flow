

# PanelDemo: Enterprise Polish

## Breedte
460px blijft — dit zit in het enterprise bereik (Linear 420-440px, Stripe 400px, Notion 440-480px).

## Titel: Reveal Header patroon

De titel scrollt mee met de content (zoals nu), maar zodra de titel uit beeld verdwijnt verschijnt er een compacte header bovenin met alleen de naam en de X-knop. Dit is het Notion-patroon.

### Hoe het werkt

```text
Scroll positie = boven:         Scroll positie = onder:
+--------------------+          +--------------------+
|                  X |          | Jan de Vries     X |  <- reveal header (h-10)
|                    |          |    subtle shadow    |
| Jan de Vries       |          |--------------------|
| 4p · Diner · 19:00 |         | [Risicoscore]      |
| [content...]       |          | [Activiteitenlog]  |
+--------------------+          +--------------------+
```

### Technische details

1. **IntersectionObserver** op het titel-element detecteert wanneer de h2 uit beeld scrollt
2. Reveal header: `h-10`, `bg-card`, `shadow-[0_1px_3px_rgba(0,0,0,0.04)]` (geen border)
3. Transitie: `opacity` + `translate-y` met `duration-150` voor een subtiel verschijnen
4. Zowel detail als form panel krijgen dit patroon
5. De reveal header toont:
   - Detail mode: gastnaam (of entity naam)
   - Form mode: formulier titel ("Nieuwe reservering")
   - X-knop rechts

### Overige verbeteringen

- Close button krijgt een subtielere `hover:bg-muted/50` in plaats van `hover:bg-secondary`
- Footer buttons in form mode krijgen `rounded-button` (8px) conform het design system
- Labels in form mode worden `text-[13px] font-medium text-muted-foreground` (design system standaard)

## Bestanden

Alleen `src/pages/PanelDemo.tsx` wordt aangepast.

