
# Widget Settings pagina -- Enterprise UI polish

## Huidige issues

Na het bekijken van de pagina vallen deze punten op:

1. **Raw `<Input>` en `<Textarea>` gebruikt** -- in plaats van `NestoInput` met `label` prop (inconsistent met design system)
2. **`Label` component los van inputs** -- de design guide schrijft voor dat labels via de `label` prop op `NestoInput`/`NestoSelect` worden gezet
3. **Enkele grote `bg-secondary/50` blokken** -- de Algemeen-sectie is een enorm grijs blok met 7+ velden erin; dit voelt niet enterprise maar eerder als een formulier-dump
4. **Geen logische groepering met dividers** -- de design guide schrijft `divide-y divide-border/50` of `border-t my-6` voor als scheiding tussen logische groepen binnen een card
5. **Section headers inconsistent** -- sommige zijn `text-sm font-semibold`, andere `text-xs uppercase tracking-wider`; de enterprise guide zegt dat sectie-headers in cards `text-base font-semibold` gebruiken
6. **Branding als aparte card** -- kleur en logo zijn slechts 2 velden; dit verdient geen eigen card maar kan als sectie binnen de hoofdcard
7. **EmbedModeSelector radio dots** -- de ronde radio-indicatoren onderaan de kaartjes voelen consumer-achtig; een subtielere selected-state is enterprise-er

## Oplossing

De pagina herstructureren naar een strakker enterprise layout met minder cards en betere groepering.

### Nieuwe structuur

```
Card 1: Configuratie
  Widget inschakelen (switch, bovenaan)
  ─────────────────────────────────────
  Basis
    Locatie slug
    Welkomsttekst
    Niet-beschikbaar tekst
    Redirect URL na boeking
  ─────────────────────────────────────
  Weergave
    Eindtijd tonen (switch)
    Nesto branding tonen (switch)
  ─────────────────────────────────────
  Branding
    Widget kleur
    Widget logo URL

Card 2: Boekingsvragen
  (ongewijzigd, eigen card is logisch)

Card 3: Integratie (als widget enabled + slug)
  Mode selector (zonder radio dots)
  ─────────────────────────────────────
  Mode-specifieke config
  ─────────────────────────────────────
  Test je integratie
  ─────────────────────────────────────
  Installatiecode
```

### Concrete wijzigingen

**`SettingsReserveringenWidget.tsx`**:
- Samenvoegen van Algemeen + Branding in een enkele NestoCard "Configuratie"
- Alle velden logisch groeperen met `border-t border-border/50 pt-5 mt-5` dividers
- Switch-rijen bovenaan (widget aan/uit) zonder bg-secondary wrapper
- Vervang alle `<Input>` door `NestoInput` met `label` prop
- Vervang `<Textarea>` door de juiste gestylde variant met label
- Vervang losse `<Label>` + hulptekst door `NestoInput` label + `FieldHelp` of inline description
- Gebruik `py-4` rijen voor switch-items in een `divide-y divide-border/50` lijst
- Secties binnen de card krijgen een `text-[13px] font-semibold text-muted-foreground uppercase tracking-wider` header

**`EmbedModeSelector.tsx`**:
- Verwijder de radio dot indicatoren onderaan elke optie
- De selected state wordt volledig bepaald door de border + achtergrondkleur (al aanwezig)
- Compacter: icoon links, tekst rechts (horizontaal in plaats van verticaal gestapeld) voor meer enterprise density

**`EmbedCodePreview.tsx`**:
- Kleine polish: code block met `font-mono text-[12px]` in plaats van `text-xs`

## Technische details

### Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/pages/settings/reserveringen/SettingsReserveringenWidget.tsx` | Cards samenvoegen, NestoInput gebruiken, divider-gebaseerde groepering |
| `src/components/settings/widget/EmbedModeSelector.tsx` | Radio dots verwijderen, horizontale layout |

### SettingsReserveringenWidget detail

De structuur wordt:

```tsx
<NestoCard className="p-6">
  {/* Widget aan/uit */}
  <div className="flex items-center justify-between">
    ...switch...
  </div>

  <div className="border-t border-border/50 pt-5 mt-5">
    <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-4">Basis</h4>
    <div className="space-y-4">
      <NestoInput label="Locatie slug" ... />
      {/* welkomsttekst */}
      <NestoSelect ... />
      <NestoInput label="Redirect URL na boeking" ... />
    </div>
  </div>

  <div className="border-t border-border/50 pt-5 mt-5">
    <h4 className="...">Weergave</h4>
    <div className="divide-y divide-border/50">
      {/* switch rijen */}
    </div>
  </div>

  <div className="border-t border-border/50 pt-5 mt-5">
    <h4 className="...">Branding</h4>
    {/* kleur + logo */}
  </div>
</NestoCard>
```

### EmbedModeSelector detail

Van verticaal gestapeld met radio dot:
```
  [icon]
  Floating knop
  Overlay popup
  (o)
```

Naar horizontaal compact zonder radio:
```
  [icon]  Floating knop -- Overlay popup
```

De selected state blijft `border-primary bg-primary/5`, de default `border-border hover:border-primary/40`. Geen radio dots meer.
