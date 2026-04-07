

# Fix: Emoji's vervangen door Lucide iconen in activiteitenlog

## Probleem

De activiteitenlog gebruikt emoji's (🌐, 💬, 📞, ✏️, 🚶) als kanaal-iconen. Dit ziet er onprofessioneel uit en is inconsistent met de rest van de app die Lucide iconen gebruikt.

## Aanpak

De emoji's zitten nu als tekst in de `description` string (via `getChannelEmoji()`). Dat moet veranderen naar een apart `channelIcon` veld dat een Lucide icon-component bevat, zodat de `OverviewTab` een echte SVG icon kan renderen.

### Wijzigingen

**`src/hooks/useAssistentLog.ts`**

1. Verwijder `getChannelEmoji()` functie
2. Voeg `channelIcon` veld toe aan het `LogEntry` type (string key ipv React component, omdat hooks geen JSX returnen)
3. Alle plekken waar `emoji` in de `prefix` werd gezet: verwijder de emoji uit de description, sla het kanaal op als `channelIcon: channel` (bijv. `'whatsapp'`, `'widget'`)

**`src/components/assistant/OverviewTab.tsx`**

1. Maak een `CHANNEL_ICON_MAP` (hergebruik patroon uit `ReservationListView.tsx`):
   - `widget` → `Globe`
   - `whatsapp` → `MessageSquare`
   - `phone` → `Phone`
   - `operator` → `Pencil`
   - `walk_in` → `Footprints`
   - `webchat` → `Globe`
2. Render het icoon links van de description (naast of in plaats van de channelLabel badge):
   ```tsx
   {entry.channelIcon && ChannelIconMap[entry.channelIcon] && (
     <ChannelIcon className="h-3.5 w-3.5 text-muted-foreground inline mr-1.5" />
   )}
   ```

## Resultaat

Elke logregel toont een subtiel Lucide icoon (consistent met de rest van de UI) in plaats van een kleurrijke emoji.

## Bestanden

| Bestand | Actie |
|---|---|
| `src/hooks/useAssistentLog.ts` | Verwijder `getChannelEmoji`, voeg `channelIcon` string veld toe, verwijder emoji uit descriptions |
| `src/components/assistant/OverviewTab.tsx` | `CHANNEL_ICON_MAP` + render Lucide icoon per logregel |

