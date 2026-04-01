

# Gastportaal Redesign + Allergieën in Boekingsflow

## Deel 1: Gastportaal Premium Redesign

### Huidige staat
`ManageReservation.tsx` (468 regels) toont alles in een verticale scroll: hero → restaurantkaart → details → modify/cancel → preferences (lange form) → chat knop. Niet compact, niet app-achtig.

### Wat verandert

**Hero header**: Als `hero_image_url` beschikbaar → grotere hero (h-48) met gradient overlay, logo + naam + `description_short` overlay. Als geen hero → subtiele gradient in `brandColor`.

**Reserveringskaart**: Compacter. Status-badge, datum/tijd/gasten op één rij. Wijzigen en Annuleren als subtiele tekstlinks (niet full-width buttons).

**Interactieve kaartjes**: Drie compacte cards in horizontale rij (grid-cols-3, op mobiel grid-cols-2 of horizontaal scrollbaar):
1. **Allergieën & voorkeuren** — toont aantal ingesteld, opent expandable sectie
2. **Stel een vraag** — badge met ongelezen berichten, opent chat
3. **Restaurant info** — openingstijden, adres (indien beschikbaar)

Elke kaart opent als expandable sectie (collapsible) — niet een aparte pagina. Subtiele 200ms transition.

**Webchat**: Wanneer geopend, neemt het de beschikbare ruimte in als mini-app. Gast-berichten rechts (lichtgrijs), restaurant links (brandColor tint) — omgewisseld t.o.v. huidige code zodat het voelt als een chat-app vanuit gastperspectief.

**Footer**: "Powered by Nesto" klein en subtiel.

### Bestanden
- `src/pages/ManageReservation.tsx` — volledige redesign

---

## Deel 2: Allergieën in de Boekingswidget

### Wat verandert

**GuestData type uitbreiden** in `BookingContext.tsx`:
```typescript
dietary_preferences?: {
  allergies: string[];
  vegetarian: boolean;
  vegan: boolean;
  other: string;
};
```

**GuestDetailsStep.tsx** — Na de bestaande velden, vóór de submit knop:
- Trigger: "Heb je allergieën of dieetwensen?" met [Ja] / [Nee] toggle-chips
- Bij "Ja": compact allergie-selector
  - Top 5 veelvoorkomend: Glutenvrij, Lactosevrij, Notenallergie, Vegetarisch, Vegan (als toggle-chips)
  - "Toon meer ▾" → alle 14 EU-allergenen
  - Vrij tekstveld voor overige
- Toggle-chips in widget-stijl (rounded-2xl, brandColor accent)

**submitBooking** in `BookingContext.tsx`:
- `dietary_preferences` meesturen in de booking request body

**public-booking-api `handleBook`**:
- Accepteer `dietary_preferences` parameter
- Bij bestaande customer: merge (niet overschrijven) met bestaande prefs
- Bij nieuwe customer: direct opslaan
- Set `reservation.badges = { allergies: true }` als er allergieën zijn

### Bestanden
- `src/contexts/BookingContext.tsx` — GuestData type + submitBooking body
- `src/components/booking/GuestDetailsStep.tsx` — allergie-selector UI
- `supabase/functions/public-booking-api/index.ts` — dietary_preferences verwerken

---

## Deel 3: Allergieën in operator-dashboard

### ReservationBadges.tsx
Werkt al — checkt `reservation.badges?.allergies`. Zodra de booking API `badges: { allergies: true }` zet, verschijnen de badges automatisch.

### CustomerCard.tsx
Uitbreiden: na contactgegevens, vóór stats, toon allergieën als oranje/rode badges met ⚠️ icoon als `customer.dietary_preferences` beschikbaar is.

### ReservationDetailPanel.tsx  
Geen wijziging nodig — CustomerCard wordt al gerenderd daarin.

### Bestanden
- `src/components/reservations/CustomerCard.tsx` — allergieën badges toevoegen
- Customer query moet `dietary_preferences` meeselecteren (check `useReservation` hook)

---

## Deel 4: Gastportaal pre-fill

`GuestPreferences.tsx` laadt al bestaande `dietary_preferences` via `webchat-preferences` endpoint. Dit werkt al. Geen wijziging nodig.

---

## Samenvatting bestanden

| Bestand | Actie |
|---|---|
| `src/pages/ManageReservation.tsx` | Redesign → compact, kaartjes, expandable secties |
| `src/components/guest/GuestChat.tsx` | Chat-bubbel richtingen aanpassen |
| `src/contexts/BookingContext.tsx` | `dietary_preferences` in GuestData + submitBooking |
| `src/components/booking/GuestDetailsStep.tsx` | Allergie-selector toevoegen |
| `supabase/functions/public-booking-api/index.ts` | dietary_preferences verwerken + badges zetten |
| `src/components/reservations/CustomerCard.tsx` | Allergieën badges tonen |
| `src/hooks/useReservation.ts` | dietary_preferences meeselecteren (indien nodig) |

## Volgorde
1. BookingContext + GuestDetailsStep (widget allergieën)
2. public-booking-api (backend verwerking)
3. ManageReservation redesign (gastportaal)
4. GuestChat bubbel-fix
5. CustomerCard allergieën badges

