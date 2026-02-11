

# Unified Assistent-icoon: custom sparkle icon overal doorvoeren

## Wat verandert

Het geüploade sparkle-icoon (vier-puntige ster met kleine ster) wordt het vaste Assistent-icoon op **alle** plekken in de app. Dit vervangt het huidige mix van `Bot`, `Sparkles` en `Mail` iconen waar ze de Assistent representeren.

## Aanpak

Een nieuw herbruikbaar SVG-component `AssistentIcon` dat het exacte icoon uit de upload nabootst: een vierpuntige ster met een kleinere ster, standaard in `text-primary` (teal). Accepteert dezelfde props als Lucide icons (`size`, `className`), zodat het overal drop-in vervangbaar is.

## Alle locaties die aangepast worden

| # | Bestand | Huidige icoon | Wat verandert |
|---|---------|---------------|---------------|
| 1 | `src/components/icons/AssistentIcon.tsx` | — | **Nieuw bestand**: SVG component |
| 2 | `src/lib/navigation.ts` | `Bot` | Sidebar menu-item "Assistent" krijgt `AssistentIcon` |
| 3 | `src/components/onboarding/TaskItem.tsx` | `Sparkles` | Assistent-badge bij taken |
| 4 | `src/components/onboarding/settings/TaskTemplateList.tsx` | `Sparkles` + `Mail` | Sparkles-icoon naast switch + Mail-icoon bij "Automatisch" label |
| 5 | `src/components/onboarding/settings/PhaseConfigCard.tsx` | `Mail` | Collapsed badge met automated count |
| 6 | `src/components/onboarding/settings/EmailTemplateEditor.tsx` | `Sparkles` | "Assistent" badge bij templates |
| 7 | `src/components/onboarding/CandidateTimeline.tsx` | `Sparkles` | Timeline events met `triggered_by: 'agent'` |
| 8 | `src/pages/Assistent.tsx` | — | PageHeader krijgt het icoon |

## Wat NIET verandert

- `email_sent` event in de timeline behoudt het `Mail` icoon -- dat is een email-event, niet een assistent-referentie
- De oranje notificatie-dot in de sidebar blijft ongewijzigd
- Dashboard alert-banner behoudt `AlertTriangle` -- dat is een urgentie-icoon, niet een assistent-icoon

## Technisch detail

### AssistentIcon component

```typescript
// src/components/icons/AssistentIcon.tsx
// SVG component met 4-puntige ster + kleine ster
// Props: size (default 16), className (default 'text-primary')
// Gebruikt currentColor zodat het Tailwind kleurklasses respecteert
```

### Navigation type-aanpassing

`MenuItem.icon` is getypt als `typeof Home` (Lucide). Het `AssistentIcon` moet dezelfde signature hebben (props met `size`, `className`). Het component wordt zo gebouwd dat het compatible is.

