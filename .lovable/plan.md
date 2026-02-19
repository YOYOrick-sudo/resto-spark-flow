

# Fix: Rode NU-lijn moet doorlopen tot bovenaan (door de tijdlijn-header)

## Probleem

De TimelineHeader (met de uur-labels 16:00, 17:00, etc.) blokkeert de rode lijn bovenaan. De hele header-rij staat op `z-[60]` met een opaque `bg-card` achtergrond. Omdat de NowIndicator op `z-50` staat, wordt de lijn afgedekt door de header -- ook in het tijdlijn-gedeelte rechts.

## Oorzaak

Op regel 91 staat:
```
<div className="sticky top-0 z-[60] flex border-b-2 border-border bg-card">
```

De hele rij (links EN rechts) is `z-[60]` met `bg-card`. Dit blokkeert de rode lijn (`z-50`) overal in de header, inclusief het rechter tijdlijn-gedeelte waar de lijn WEL zichtbaar moet zijn.

## Oplossing

Splits de z-index van de TimelineHeader:

1. **Buitenste wrapper (regel 91):** Verlaag van `z-[60]` naar `z-[45]`. Dit zorgt dat de NowIndicator (`z-50`) BOVEN de header-achtergrond wordt getekend in het tijdlijn-gedeelte.
2. **Linkerkolom (regel 92):** Behoud `z-[60]`. Dit blokkeert de rode lijn in de labelkolom.

De header blijft sticky en zichtbaar, maar de rode lijn schijnt er in het rechtergedeelte doorheen. De linkerkolom (140px) blokkeert de lijn nog steeds.

## Technische wijziging

### `src/components/reserveringen/ReservationGridView.tsx`

**Regel 91:**
- Was: `z-[60]`
- Wordt: `z-[45]`

(Regel 92 blijft `z-[60]` -- alleen de linkerkolom behoudt de hoge z-index.)

Resultaat: 1 regel aanpassen.
