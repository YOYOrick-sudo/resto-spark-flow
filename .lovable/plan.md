

# MEP Quick Add: 3 fixes

## Problemen

1. **Geen duplicate check bij multi-methode** — als je "Kruidenboter bereiden" 2× toevoegt, wordt het 2 losse taken i.p.v. units ophogen. De duplicate check werkt al in de code, maar het probleem zit erin dat `dayTasks` alleen de huidige dag bevat terwijl `getSmartDate()` naar morgen kan wijzen (na 17:00). Fix: ook taken van smartDate ophalen, of de check uitbreiden.

2. **Multi-methode dropdown onduidelijk** — de screenshot toont "Kruidenboter" als kop met "Bereiden" / "Snijden" eronder, maar visueel is niet duidelijk dat dit methodes zijn van dat halffabricaat. Fix: subtiele methode-labels met betere hiërarchie.

3. **Single-methode items tonen geen methode type** — als een halffabricaat maar 1 methode heeft, zie je alleen de naam zonder welke methode. Fix: toon methode type ook bij single-methode items.

## Wijzigingen

### `src/components/mep/MepQuickAddDropdown.tsx`

**Single-methode items (issue 3):** Toon methode type als subtekst naast categorie:
```
Kruidenboter
Prep · Bereiden · 1 rol
```

**Multi-methode items (issue 2):** Betere visuele hiërarchie:
- Halffabricaat naam als groepskop met categorie ernaast in muted tekst
- Methodes als ingesprongen rijen met het type als hoofdtekst + visuele_eenheid als subtekst
- Lichte achtergrondkleur voor de methode-rijen om groepering te verduidelijken

Voorbeeld weergave:
```text
HALFFABRICATEN

Kruidenboter · Prep
  Bereiden · 1 rol                    [+]
  Snijden                             [+]
```

### `src/components/mep/MepQuickAdd.tsx`

**Duplicate check (issue 1):** De `handleAddHalffabricaat` functie checkt `dayTasks` maar die bevat alleen taken van `selectedDate`. Als `getSmartDate()` naar morgen wijst, vindt hij geen bestaande taken. Fix: de duplicate check moet ook zoeken op basis van de smartDate door de parent ook taken van die datum mee te geven, OF door een directe supabase query te doen in de handler.

Pragmatische fix: doe een snelle supabase query in `handleAddHalffabricaat` om te checken of er al een taak bestaat voor die `recept_id + methode_id + smartDate` combinatie, in plaats van alleen op de lokale `dayTasks` array te vertrouwen.

### Samenvatting bestanden

| # | Bestand | Actie |
|---|---------|-------|
| 1 | `src/components/mep/MepQuickAddDropdown.tsx` | Methode type tonen bij single-methode + betere hiërarchie bij multi-methode |
| 2 | `src/components/mep/MepQuickAdd.tsx` | Duplicate check via supabase query i.p.v. alleen lokale dayTasks |

Geen database wijzigingen.

