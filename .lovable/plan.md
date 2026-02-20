

# Availability Indicators: Tekst uit de tijdslots, labels eronder

## Probleem

Nu staat "Bijna vol" en "Laatste plekken" IN de tijdslot-knoppen zelf. Dat is rommelig en niet enterprise-waardig. De tekst hoort er niet in maar eronder, als een gecentreerde legenda die refereert aan de dots.

## Aanpak

### Mockup A

De tijdslot-buttons tonen alleen de tijd. Geen tekst-labels meer binnenin de buttons. In plaats daarvan:

- Slots met `medium` availability krijgen een kleine amber dot onder de tijd (gecentreerd)
- Slots met `low` availability krijgen een kleine rode dot onder de tijd (gecentreerd)
- `high` slots: geen dot, schoon
- De legenda onderaan blijft: amber dot = "Bijna vol", rode dot = "Laatste plekken"
- Buttons worden weer uniform `py-3` (geen wisselende padding meer)
- `bg-red-50` achtergrond bij low-slots blijft als subtiel signaal

### Mockup B

De chip-buttons tonen alleen de tijd (en checkmark bij selectie). Geen "Laatste plekken" tekst meer inline in de chip:

- `medium`: amber dot links van de tijd (blijft zoals nu)
- `low`: rode dot links van de tijd met glow (blijft), maar de tekst "Laatste plekken" wordt verwijderd uit de chip
- De legenda onderaan verklaart de dots: amber = "Bijna vol", rood = "Laatste plekken"

## Bestanden

1. `src/components/widget-mockups/MockWidgetA.tsx` -- Step 3: tekst-labels uit buttons verwijderen, dots toevoegen, padding uniformiseren
2. `src/components/widget-mockups/MockWidgetB.tsx` -- Step 3: "Laatste plekken" tekst uit chips verwijderen

