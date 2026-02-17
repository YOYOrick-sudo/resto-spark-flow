

# Detail Panel: Heldere Hiërarchie

## Probleem
De volgorde "status badge → context label → naam" is onduidelijk. De status badge en het kleine "Reservering" label botsen visueel.

## Oplossing
Verplaats de status badge onder de summary-regel, zodat de hiërarchie wordt:

1. **Context label** — "Reservering" (klein, muted)
2. **Naam** — "Jan de Vries" (groot, bold)
3. **Summary regel** — 4p · Diner · Tafel 12 · 19:00–21:00
4. **Status badge** — [Bevestigd] (met mt-3)

Dit volgt het Linear/Notion patroon: type eerst, dan entity, dan metadata inclusief status.

## Technisch

Bestand: `src/pages/PanelDemo.tsx`, regels 77-94

Huidige volgorde:
- Status badge (regels 78-81)
- Context label "Reservering" (regel 83)
- Naam h2 (regel 84)
- Summary regel (regels 86-94)

Nieuwe volgorde:
- Context label "Reservering" (zonder mb, direct boven naam)
- Naam h2 (met ref)
- Summary regel
- Status badge (verplaatst naar onder summary, met mt-3)

De badge styling blijft identiek, alleen de positie verandert.
