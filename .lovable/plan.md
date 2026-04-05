

# Kanaal-indicator: van emoji naar NestoBadge

## Wat verandert

De emoji-iconen (🌐 💬 📞 etc.) in de activiteitenlog worden vervangen door subtiele `NestoBadge` componenten in `sm` size met `outline` variant. Dit past in het design system en oogt professioneler.

## Visueel resultaat

```text
23:52  [Web]  Jan de Vries heeft gereserveerd voor vrijdag 19:00 (2p). ✓  ✦
14:32  [WhatsApp]  Jan wilde met 6 ipv 4 komen. Aangepast. ✓  ✦
11:15  [Telefoon]  Piet Jansen heeft gereserveerd voor zaterdag 19:30 (6p). ✓  ✦
09:00  📨 8 reminders verstuurd voor vanavond. ✓  ✦
```

De badges zijn klein (`sm`), `outline` variant (border only, geen achtergrond), en met `text-muted-foreground` zodat ze niet afleiden van de beschrijving.

## Kanaal-mapping

| Kanaal | Label | 
|---|---|
| `widget` / `webchat` | Web |
| `whatsapp` | WhatsApp |
| `phone` | Telefoon |
| `operator` | Handmatig |
| `walk_in` | Inloop |

## Wijzigingen

### 1. `src/hooks/useAssistentLog.ts`

- `channelIcon` property hernoemen naar `channelLabel` (string, bijv. "Web", "WhatsApp")
- `getChannelIcon()` wordt `getChannelLabel()` — retourneert korte Nederlandse tekst ipv emoji

### 2. `src/components/assistant/OverviewTab.tsx`

- Vervang de `<span>{entry.channelIcon}</span>` door:
```tsx
{entry.channelLabel && (
  <NestoBadge variant="outline" size="sm" className="text-muted-foreground flex-shrink-0">
    {entry.channelLabel}
  </NestoBadge>
)}
```

Bulk berichten (📨) behouden hun emoji in de description tekst — die hebben geen apart kanaal-badge.

### Bestanden

| Bestand | Actie |
|---|---|
| `src/hooks/useAssistentLog.ts` | `channelIcon` → `channelLabel`, emoji → tekst |
| `src/components/assistant/OverviewTab.tsx` | Render `NestoBadge` outline sm ipv emoji span |

