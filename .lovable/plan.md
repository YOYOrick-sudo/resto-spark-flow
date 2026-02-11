

# Fix: CandidateActions sticky action bar layout

## Probleem

De action bar met "Afwijzen" en "Doorgaan" buttons spant over de volle breedte van de pagina. Door `justify-between` staan de twee buttons op de uiterste linker- en rechterrand, wat er niet professioneel uitziet.

## Oplossing

De buttons naar **rechts groeperen** met een gap ertussen, conform het enterprise footer-patroon (zie MODAL_PATTERNS.md: "rechts uitgelijnd met gap-3"). De "Afwijzen" button (destructive outline) staat links van "Doorgaan" (primary), beide rechts uitgelijnd.

Dit is hetzelfde patroon als modal footers — consistent door de hele applicatie.

## Wijziging

**Bestand:** `src/components/onboarding/CandidateActions.tsx`

- Verander `flex justify-between` naar `flex justify-end gap-3`
- Dit groepeert beide buttons rechts met een nette gap ertussen
- Hired/rejected status-tekst blijft links uitgelijnd (die krijgt `mr-auto` of aparte `justify-start`)

## Technisch detail

```
// Huidig (probleem)
<div className="... flex justify-between items-center">

// Nieuw (enterprise correct)  
<div className="... flex justify-end items-center gap-3">
```

Voor de hired/rejected states wordt `justify-start` gebruikt zodat de statustekst links blijft.

| Bestand | Actie |
|---------|-------|
| `src/components/onboarding/CandidateActions.tsx` | `justify-between` -> `justify-end gap-3`, hired/rejected states apart afhandelen |

