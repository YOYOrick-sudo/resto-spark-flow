

# Gastportaal — Volledige Redesign

## Wat verandert

Het huidige portaal heeft drie kaartjes (Allergieën, Chat, Info) als aparte klikbare blokken, een reserveringskaart met gast-naam + ticket-type, en een "Restaurant info" sectie. Dit wordt volledig vervangen door een minimalistisch, foto-gedreven design.

## Architectuur

### Above the fold — Alleen bevestiging

```text
┌─────────────────────────────────┐
│   [Hero foto h-56, full width]  │
│   Gradient overlay              │
│   Logo (klein) + Restaurantnaam │
├─────────────────────────────────┤
│                                 │
│         ✓ Bevestigd             │  ← brand_color vinkje, text-xl
│   Vrijdag 4 april · 19:30      │  ← text-lg
│        4 personen               │  ← text-base, muted
│                                 │
│    Wijzigen · Annuleren         │  ← Tekst-links, geen knoppen
│                                 │
└─────────────────────────────────┘
```

Geen gastnaam, geen ticket-type, geen kaartjes. Alleen status + datum/tijd/gasten.

### Onder de fold — Progressive disclosure

1. **Chat sectie**: Eén input-veld ("Stel je vraag...") dat expandeert bij klik
2. **Allergieën**: Inline tekst ("Geen opgegeven [Toevoegen →]" of pills + [Wijzig]). Expandeert bij klik
3. **Locatie**: Adres + "Route →" link (Google Maps via `google_place_id`)
4. **Footer**: "Powered by nesto"

### Wat verdwijnt
- ❌ Gastnaam in de header (de gast weet wie hij is)
- ❌ Ticket-type badge
- ❌ Drie ActionCard knoppen
- ❌ ExpandableSection wrapper component
- ❌ Guest notes in de kaart
- ❌ StatusBadge component (wordt inline tekst met vinkje)
- ❌ "Restaurant info" kaart

### Zonder hero_image_url
Zachte gradient `from-[brand_color]/8 to-white`, logo gecentreerd h-14, naam eronder in zwart.

## Database

Er is geen `address` kolom op `locations`. De locatie-sectie gebruikt `google_place_id` om een Google Maps link te genereren. Geen DB-migratie nodig voor MVP — adres kan later als kolom worden toegevoegd.

## Technische details

### Bestanden

| Bestand | Wijziging |
|---|---|
| `src/pages/ManageReservation.tsx` | Volledig herschrijven: hero → bevestiging → chat input → allergieën inline → locatie → footer. Verwijder ActionCard, StatusBadge, ExpandableSection. Modify/cancel modes blijven maar worden inline in de bevestigingssectie |
| `src/components/guest/GuestChat.tsx` | Aanpassen: default staat = alleen input veld. Bij focus/klik expandeert naar chat view met messages. Geen aparte "Stel een vraag" knop meer |
| `src/components/guest/GuestPreferences.tsx` | Aanpassen: toevoegen van een "summary" mode die pills toont van geselecteerde allergieën + "Wijzig" link. Expandeert naar volledige editor bij klik |

### Visuele specs (uit brief)
- Achtergrond: `#FAFAFA`
- Max breedte: `max-w-md` (448px)
- Sectie spacing: `py-8`
- Chat bubbles: `rounded-2xl` met `rounded-br-md` (gast) / `rounded-bl-md` (restaurant)
- Pills: `rounded-full`, border only, geselecteerd = brand_color fill
- Hero met foto: `h-56`, gradient `from-black/60 via-black/20 to-transparent`
- Hero zonder foto: gradient `from-[brand_color]/8 to-white`
- Tekst: Inter, geen serif

### Volgorde
1. ManageReservation.tsx — hero + bevestigingssectie + inline modify/cancel
2. GuestChat — expandable input-first mode
3. GuestPreferences — summary/edit mode met inline pills
4. Secties samenvoegen: chat → allergieën → locatie → footer

