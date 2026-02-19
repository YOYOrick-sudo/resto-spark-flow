

# AI Suggesties integreren in Kleurenpalet

## Probleem

Nu zijn er twee aparte secties die hetzelfde doen:
1. Curated palette chips (statisch, altijd zichtbaar)
2. AI suggesties (apart kaartje, na klik op knop)

Dit voelt dubbel -- twee rijen met kleurencombinaties.

## Nieuwe aanpak

De **curated palettes worden vervangen door AI-gegenereerde paletten** die automatisch laden wanneer het component mount. Geen aparte knop meer, geen apart kaartje -- de palette chips zelf zijn de AI suggesties.

```text
Kleurenpalet
  [Warme Herfst ●●] [Oceaan Bries ●●] [Nacht & Goud ●●] [Custom ●●]
  [sparkle] Nieuwe suggesties          <-- refresh knop (inline, subtiel)

  Hoofdkleur          Accentkleur
  [swatch grid]       [swatch grid]
  [#10B981___]        [#14B8A6___]
```

## Hoe het werkt

1. **Bij mount**: Component laadt 3 AI suggesties automatisch (edge function call)
2. **Palette chips**: De 3 AI suggesties verschijnen als klikbare chips met naam + twee kleurcirkels
3. **Custom chip**: Als de huidige kleuren niet matchen met een suggestie, verschijnt een "Custom" chip (actief)
4. **Refresh knop**: Een klein "Nieuwe suggesties" knopje (met sparkle icon) haalt 3 nieuwe paletten op
5. **Fallback**: Tijdens laden of bij een fout worden de 5 statische curated palettes getoond (zodat de UI nooit leeg is)
6. **Tooltip**: Elke AI chip toont de reasoning als tooltip bij hover

## Wat verdwijnt

- De "Stel betere kleuren voor" knop
- Het aparte AI suggesties kaartje met "Toepassen" knoppen
- De NestoCard wrapper voor AI resultaten

## Wat blijft

- Swatch grids (hoofdkleur + accentkleur) -- ongewijzigd
- Hex inputs -- ongewijzigd
- Custom chip indicator -- ongewijzigd

## Technische details

### Bestand: `ColorPaletteSelector.tsx`

Wijzigingen:
- `useEffect` bij mount: roept `fetchSuggestions()` aan
- `CURATED_PALETTES` wordt de fallback (getoond tijdens laden / bij error)
- State `suggestions` wordt de primaire bron voor palette chips
- De palette chips rendering gebruikt `suggestions ?? CURATED_PALETTES` (met mapping)
- AI suggesties kaart (regels 230-271) wordt verwijderd
- AI knop (regels 212-228) wordt vervangen door een compacte "Nieuwe suggesties" refresh link
- Tooltip met `title` attribuut op elke AI chip voor de reasoning

### Edge function: geen wijzigingen nodig

De `suggest-widget-colors` functie werkt al correct en retourneert 3 suggesties.

### Geen database wijzigingen nodig

