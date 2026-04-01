

# Gastportaal Premium Styling Upgrade

## Wat verandert

### 1. Header — weg met groene balk
- **Met hero_image**: h-52, donkere gradient overlay, logo + naam in wit onderaan — al bijna goed, hoogte vergroten
- **Zonder hero_image**: witte/lichtgrijze achtergrond (geen gekleurde gradient), logo gecentreerd h-16, naam eronder in serif, subtiele border-bottom of shadow-sm als scheiding
- Brand color alleen als accent, nooit als vlakkleur

### 2. GuestPreferences — toggle-chips i.p.v. checkboxen
- Verwijder dubbele titel (ExpandableSection header + component header)
- Top 5 veelvoorkomend als rounded-full toggle-chips (pills): Glutenvrij, Lactosevrij, Noten, Vegetarisch, Vegan
- "Alle allergenen ▾" klikbare tekst → toont overige 9 als pills
- Geen vierkante checkbox-indicators meer — alleen pill selected/unselected state
- Selected: `bg-[brand]/10 border-[brand] text-[brand] rounded-full px-4 py-2`
- Unselected: `border border-border rounded-full px-4 py-2 text-sm text-muted-foreground`

### 3. ActionCards — verfijning
- Meer padding (p-5), iconen h-7 w-7
- Geen border default, alleen subtiele shadow-sm
- Hover: shadow + border-kleur hint
- Actieve kaart (open sectie): border in brand_color, lichte bg tint

### 4. Reserveringskaart — compacter
- Status badge in brand_color tint (al zo, bevestigen)
- Ticket-type tekst kleiner of verwijderen
- Wijzigen/Annuleren als subtiele tekst-links (al zo, OK)
- Datum/tijd/personen met subtiele `·` scheiders i.p.v. gap

### 5. Webchat GuestChat — bubbel styling
- Lege state: "Heb je een vraag? We helpen je graag!"
- Bubble styling al redelijk, fine-tune border-radius en spacing

### 6. Typografie en spacing
- Gastnaam: text-xl font-semibold
- Secties: gap-6 tussen major blocks
- max-w-lg (al max-w-md, upgraden naar max-w-lg)
- Serif font voor restaurantnaam in header (Georgia)

### 7. Footer
- text-xs text-muted-foreground/50 — nog subtieler

## Bestanden

| Bestand | Wijziging |
|---|---|
| `src/pages/ManageReservation.tsx` | Header redesign, card refinements, spacing, typography |
| `src/components/guest/GuestPreferences.tsx` | Toggle-chips, collapsed allergens, remove duplicate title |
| `src/components/guest/GuestChat.tsx` | Empty state tekst, minor styling |

## Volgorde
1. GuestPreferences → chips + collapsible allergenen
2. ManageReservation → header, cards, spacing, typography
3. GuestChat → empty state + minor polish

