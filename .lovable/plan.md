

# PanelDemo: gelijke breedte + enterprise header

## Wijzigingen

### 1. Beide panels zelfde breedte: 460px
Zowel detail als form krijgen `w-[460px]` in plaats van 420/480.

### 2. Header verbeteren: geen sticky, meer enterprise

De huidige header met border-bottom die altijd zichtbaar blijft voelt inderdaad niet enterprise. Bij tools als Linear en Notion scrollt de header gewoon mee met de content -- de titel staat in de content zelf, niet in een vaste balk.

Nieuw patroon:
- **Alleen een X-knop** rechtsboven als floating element (absolute positioned, altijd zichtbaar)
- **Geen aparte header-balk** met border-bottom
- De **titel** staat als eerste element in de scrollbare content
- Dit geeft meer ruimte en voelt cleaner

Visueel verschil:

```text
  WAS:                          WORDT:
  +------------------+          +------------------+
  | Reservering    X |          |                X |  <- alleen X floating
  |------------------|          |                  |
  | [content]        |          | Reservering      |  <- titel in content
  | [scrollt]        |          | [content]        |
  +------------------+          | [scrollt mee]    |
                                +------------------+
```

### 3. Labels aanpassen
Beide labels tonen "460px" en de beschrijving wordt aangepast.

