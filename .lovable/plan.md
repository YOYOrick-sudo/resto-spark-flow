

# MEP Favorieten — Onthoud veelgebruikte taken

## Probleem

Als een kok "Zout aanvullen" toevoegt via Snelle Prep, moet hij de volgende dag opnieuw zoeken. Er is geen manier om veelgebruikte taken te onthouden en snel opnieuw toe te voegen.

## Oplossing

Een `mep_favorieten` tabel die per locatie veelgebruikte taak-templates opslaat. Deze worden als horizontale chips boven de zoekbalk getoond. Eén tik = taak op de MEP. Lang indrukken of X = verwijderen.

```text
┌──────────────────────────────────────────────────┐
│ ★ Zout aanvullen   ★ Kruidenboter bereiden   +  │  ← chips
├──────────────────────────────────────────────────┤
│ 🔍 Zoek halffabricaat, ingrediënt...             │  ← zoekbalk
└──────────────────────────────────────────────────┘
```

### Hoe komen favorieten erin?

1. **Automatisch** — na het afronden van een taak (completion) verschijnt een subtiele toast-actie: "Onthouden als favoriet?"
2. **Handmatig** — bij het toevoegen via Quick Add verschijnt een ster-icoontje naast het zoekresultaat om het direct als favoriet op te slaan.

### Hoe verwijder je favorieten?

- Elke chip heeft een kleine `×` knop die zichtbaar wordt bij hover.
- Klik op `×` → ConfirmDialog → verwijderd.

## Technische wijzigingen

### Database migratie

Nieuwe tabel `mep_favorieten`:

```sql
CREATE TABLE public.mep_favorieten (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid REFERENCES public.locations(id) ON DELETE CASCADE NOT NULL,
  title varchar NOT NULL,
  category varchar NOT NULL DEFAULT 'Overig',
  recept_id uuid REFERENCES public.recepten(id) ON DELETE CASCADE,
  methode_id uuid REFERENCES public.halffabricaat_methodes(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (location_id, title)
);

ALTER TABLE public.mep_favorieten ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own location favorieten"
  ON public.mep_favorieten FOR ALL TO authenticated
  USING (location_id IN (
    SELECT location_id FROM organization_members
    WHERE user_id = auth.uid()
  ))
  WITH CHECK (location_id IN (
    SELECT location_id FROM organization_members
    WHERE user_id = auth.uid()
  ));
```

### Nieuwe bestanden

| # | Bestand | Doel |
|---|---------|------|
| 1 | `src/hooks/useMepFavorieten.ts` | CRUD hook: fetch, add, remove favorieten |
| 2 | `src/components/mep/MepFavorieten.tsx` | Horizontale chip-strip boven zoekbalk |

### Gewijzigde bestanden

| # | Bestand | Wijziging |
|---|---------|-----------|
| 1 | `src/components/mep/MepQuickAdd.tsx` | Render `<MepFavorieten />` boven zoekbalk; bij klik op favoriet → taak aanmaken (met zelfde duplicate check) |
| 2 | `src/components/mep/MepQuickAddDropdown.tsx` | Ster-icoontje per zoekresultaat om direct als favoriet op te slaan |
| 3 | `src/components/mep/MepCompletionModal.tsx` | Na afronden: optionele "Onthouden als favoriet" knop als taak nog geen favoriet is |

### UX details

- **Chips**: `NestoBadge`-achtige styling, horizontaal scrollbaar, met `×` bij hover
- **Klik op chip**: Maakt direct een MEP taak aan voor de geselecteerde datum (met duplicate check)
- **Maximaal ~8 favorieten** per locatie (soft limit, geen harde restrictie)
- **Volgorde**: Laatst aangemaakt bovenaan (of meest gebruikt — simpel `created_at DESC` voor nu)

