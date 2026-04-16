

# Plan: Methode-info tonen in MEP Recent-sectie

## Probleem
Recent-items tonen alleen `{categorie}` (bijv. "Sauzen"), terwijl halffabricaten `{categorie} · {methode.type} · {visuele_eenheid}` tonen. Bij halffabricaten met meerdere methodes (Vissoep Bereiden vs Opwarmen) zie je geen verschil.

## Oorzaak
`mep_favorieten` slaat `methode_id` op maar de query doet `select("*")` — geen join op `halffabricaat_methodes`. De dropdown rendert alleen `fav.category`.

## Oplossing
Eén wijziging in de query + één in de rendering. Geen schema-wijziging nodig.

### 1. `src/hooks/useMepFavorieten.ts` — Join methode data

Verander de select van `"*"` naar:
```
"*, methode:halffabricaat_methodes!mep_favorieten_methode_id_fkey(type, visuele_eenheid)"
```

Update het `MepFavoriet` type met:
```typescript
methode: { type: string; visuele_eenheid: string | null } | null;
```

### 2. `src/components/mep/MepQuickAddDropdown.tsx` — Toon methode in subtitle

Verander de subtitle van recent-items van:
```
<p className="text-xs text-muted-foreground">{fav.category}</p>
```
naar:
```
<p className="text-xs text-muted-foreground">
  {fav.category}
  {fav.methode && (
    <>
      {" · "}<span className="capitalize">{fav.methode.type}</span>
      {fav.methode.visuele_eenheid && <>{" · "}{fav.methode.visuele_eenheid}</>}
    </>
  )}
</p>
```

Identiek format als de halffabricaten-sectie.

## Bestanden

| Bestand | Actie |
|---------|-------|
| `src/hooks/useMepFavorieten.ts` | Join op `halffabricaat_methodes`, extend type |
| `src/components/mep/MepQuickAddDropdown.tsx` | Methode info in recent subtitle |

