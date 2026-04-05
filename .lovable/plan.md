

# Activiteitenlog — Persoonlijk + kanaal-iconen + slimme datums + klikbare navigatie

## Wat verandert

De `useAssistentLog` hook en `OverviewTab` worden aangepast met vier verbeteringen:

1. **Filter technische events** — alleen menselijk relevante acties tonen
2. **Kanaal-icoon per logregel** — emoji op basis van reservation.channel
3. **Persoonlijke tekst met slimme datums** — "vanavond", "morgen", "vrijdag", "12 april"
4. **Klikbare logregels met navigatie + highlight** — reserveringen openen in het juiste scherm

## Wijzigingen per bestand

### 1. `src/hooks/useAssistentLog.ts`

**LogEntry interface uitbreiden:**
- `channelIcon?: string` — emoji per kanaal
- `clickPath` wordt slimmer: bevat datum + highlight parameter

**Technische events filteren:** Skip `field_update`, `auto_assign`, `status_change`, `trigger` acties. Alleen `created`, `updated`, `deleted` op reservations doorlaten.

**Deduplicatie:** Groepeer audit entries op `entity_id` + tijdstip binnen 5 seconden. Houd meest informatieve entry.

**`formatSmartDate(date)`:** Vandaag → "vanavond"/"vanmiddag", morgen → "morgen", ≤7d → weekdag, >7d → "12 april".

**`getChannelIcon(channel)`:** `widget`/`webchat` → 🌐, `whatsapp` → 💬, `phone` → 📞, `operator` → ✏️, `walk_in` → 🚶.

**`humanizeAudit` herschrijven:** Persoonlijke tekst met gastnaam + slimme datum + kanaal-icoon.

**Klikbare navigatie — `clickPath` logica:**
- Reservering-entries: `/reserveringen?date={reserveringsdatum}&highlight={reservation_id}`
  - De datum is de datum van de reservering (uit `changes.date` of `metadata.reservation_date`)
- Bericht-entries: `/assistent?tab=berichten&conversation={conversation_id}`
- Bulk reminders: geen clickPath (geen individueel gesprek)

### 2. `src/components/assistant/OverviewTab.tsx`

**Kanaal-icoon renderen:** Vóór de description tekst, na de timestamp:
```tsx
<span className="mr-1.5">{entry.channelIcon}</span>
```

**Klikgedrag behoudt huidige structuur** — `onClick={() => entry.clickPath && navigate(entry.clickPath)}` werkt al. Geen wijziging nodig behalve dat clickPath nu slimmere URLs bevat.

### 3. `src/pages/Reserveringen.tsx` (of equivalent reserveringenpagina)

**Highlight parameter uitlezen:**
- Lees `highlight` uit `searchParams`
- Bij mount: als `highlight` aanwezig is:
  1. Zoek de reservering in de lijst
  2. Scroll naar die rij (via `scrollIntoView`)
  3. Voeg tijdelijke `animate-pulse` class toe met `bg-primary/10` achtergrond (2 seconden)
  4. Open het detail panel voor die reservering
  5. Verwijder `highlight` uit URL na animatie (clean URL)

### 4. Reserveringentabel/kaart component

**Highlight styling:** Conditie op basis van `highlightId === reservation.id`:
```tsx
className={cn(
  'transition-colors',
  isHighlighted && 'animate-pulse bg-primary/10'
)}
```
Na 2 seconden wordt `isHighlighted` op `false` gezet via `setTimeout`.

## Bestanden

| Bestand | Actie |
|---|---|
| `src/hooks/useAssistentLog.ts` | Filter, dedupliceer, `formatSmartDate`, `getChannelIcon`, persoonlijke tekst, slimme `clickPath` met datum + highlight |
| `src/components/assistant/OverviewTab.tsx` | Render `channelIcon` emoji vóór description |
| `src/pages/Reserveringen.tsx` | Lees `highlight` param, scroll + pulse + open detail panel |
| Reservering rij/kaart component | Conditionele highlight styling |

