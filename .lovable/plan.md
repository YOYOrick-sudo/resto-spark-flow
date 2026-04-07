

# Fix: Emoji verwijderen bij bulk reminders/bevestigingen

## Probleem

De bulk_messages entries (reminders, bevestigingen) op regel 215 in `useAssistentLog.ts` bevatten nog een hardcoded `📨` emoji. Deze entries hebben ook geen `channelIcon` gezet, waardoor er geen Lucide icoon wordt getoond.

## Fix

### `src/hooks/useAssistentLog.ts` — regel 215

Verwijder de `📨` emoji uit de description en voeg een `channelIcon` toe:

```typescript
// Was:
description: `📨 ${msgs.length} ${label} verstuurd. ✓`,
channelLabel: undefined,

// Wordt:
description: `${msgs.length} ${label} verstuurd. ✓`,
channelIcon: 'whatsapp',  // reminders gaan via WhatsApp
channelLabel: undefined,
```

### `src/components/assistant/OverviewTab.tsx` — CHANNEL_ICON_MAP

Voeg een `mail` entry toe voor het geval bulk berichten via andere kanalen gaan:

```typescript
import { Mail } from 'lucide-react';

// Voeg toe aan CHANNEL_ICON_MAP:
mail: Mail,
```

Eigenlijk: de reminders gaan via WhatsApp, dus `channelIcon: 'whatsapp'` geeft automatisch het `MessageSquare` icoon. Als het template-kanaal varieert, pak het kanaal uit het eerste bericht (`msgs[0].channel`). Dat is robuuster.

## Bestanden

| Bestand | Actie |
|---|---|
| `src/hooks/useAssistentLog.ts` | Verwijder `📨` emoji, voeg `channelIcon` toe op basis van `msgs[0]` kanaal |

