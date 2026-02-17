
# Reveal Header: Vloeiender Transitie

## Het probleem
Nu springt "Nieuwe reservering" abrupt van `text-lg` (18px, in de content) naar `text-sm` (14px, in de reveal header). Dat voelt als twee losse elementen in plaats van een vloeiende overgang.

## De oplossing: Crossfade met vertraagde timing

In plaats van een simpele opacity toggle, gebruiken we een **gestaffelde crossfade**:

1. **De grote titel** (`h2`) fade out terwijl hij uit beeld scrollt (dit gebeurt al natuurlijk door het scrollen)
2. **De reveal header** fade in met een iets langere `duration-200` en een subtiele `translate-y` van `-4px` naar `0` (in plaats van de huidige `-4px` jump)
3. **De tekst in de reveal header** wordt `text-[13px] font-medium` (i.p.v. `text-sm font-semibold`) -- dit sluit beter aan bij de enterprise labels in het systeem en maakt het contrast minder groot
4. **Een backdrop-blur** (`backdrop-blur-[2px]`) op de reveal header zodat de content er subtiel doorheen schemert tijdens de overgang -- dit creëert een visuele "brug" tussen de twee states

```text
Scroll:  titel zichtbaar          titel verdwijnt           reveal header zichtbaar
         +------------------+     +------------------+     +------------------+
         |                X |     |                X |     | Nieuwe reserv. X |
         |                  |     |  ~~~~~~~~~~~~    |     |  backdrop-blur   |
         | Nieuwe           |     | content schuift  |     |------------------|
         | reservering      |     | omhoog...        |     | [form fields]    |
         +------------------+     +------------------+     +------------------+
```

## Technische wijzigingen

Bestand: `src/pages/PanelDemo.tsx`

### Reveal header styling aanpassen
- `duration-150` wordt `duration-200` voor een soepelere transitie
- `-translate-y-1` (4px) wordt `-translate-y-0.5` (2px) voor een subtielere entry
- `text-sm font-semibold` wordt `text-[13px] font-medium` om het formaat-verschil te verkleinen
- Toevoegen: `backdrop-blur-[2px]` aan de reveal header voor een glazen effect
- `bg-card` wordt `bg-card/95` zodat de blur zichtbaar is (95% opacity)
- Shadow wordt iets subtieler: `shadow-[0_1px_2px_rgba(0,0,0,0.03)]`

Resultaat: de overgang voelt als een natuurlijke "morph" in plaats van een harde switch.
