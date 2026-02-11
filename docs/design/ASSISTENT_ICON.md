# Assistent Icon — Design Specification

## Icoon: Sparkle (vierpuntige ster)

Het Assistent-icoon is een **vierpuntige sparkle-ster** met een kleinere secundaire ster rechtsboven. Dit is het universeel herkende "AI/automatisering" icoon (vergelijkbaar met Google Gemini, Notion AI, etc.).

## Component

```tsx
import { AssistentIcon } from '@/components/icons/AssistentIcon';

// Standaard (16px, primary kleur)
<AssistentIcon />

// Aangepaste grootte
<AssistentIcon size={14} />
<AssistentIcon size={20} />

// Custom kleur via className
<AssistentIcon className="text-muted-foreground" />
```

## Props

| Prop | Type | Default | Beschrijving |
|------|------|---------|-------------|
| `size` | `number \| string` | `16` | Breedte en hoogte in pixels |
| `className` | `string` | `'text-primary'` | Tailwind classes, standaard teal primary |
| `color` | `string` | — | Directe kleur override |

## Wanneer gebruiken

| Context | Voorbeeld |
|---------|-----------|
| **Geautomatiseerde taak** | Naast taak-titel in phase config wanneer `is_automated: true` |
| **Assistent badge** | In combinatie met `<NestoBadge variant="primary">Assistent</NestoBadge>` |
| **Collapsed count** | In phase card header: `<AssistentIcon size={14} /> 3×` |
| **Sidebar navigatie** | Menu-item "Assistent" in NestoSidebar |
| **Assistent pagina** | Filter chips en item cards |

## Wanneer NIET gebruiken

- Voor handmatige acties door teamleden
- Als decoratief element zonder functionele betekenis
- In combinatie met andere AI-iconen (alleen dit icoon gebruiken)

## Visuele regels

1. **Kleur**: Altijd `text-primary` (teal) tenzij in een disabled/muted context
2. **Grootte**: `14px` inline bij tekst, `16px` standaard, `20px` in headers
3. **Spacing**: Minimaal `gap-1` (4px) tussen icoon en bijbehorende tekst
4. **Pairing**: Mag gecombineerd worden met tekst "Automatisch" of badge "Assistent"

## SVG Structuur

Het icoon bestaat uit twee `<path>` elementen met `fill="currentColor"`:
- **Grote ster**: Gecentreerd op (10, 10) in een 24×24 viewBox
- **Kleine ster**: Offset naar rechtsboven op (19, 6)

Beide sterren zijn vierpuntig (diamond-sparkle vorm) zonder stroke, alleen fill.
