
# Fix: Toon methode type in MEP taak-rij

Eén kleine wijziging in `src/components/mep/MepTaskRow.tsx`:

In de titel-`span` (rond regel 63), voeg methode type toe achter de taaknaam, maar alleen als de titel het type nog niet bevat:

```tsx
const methodeType = task.methode?.type?.toLowerCase();
const showMethode = methodeType && !task.title.toLowerCase().includes(methodeType);

// In de titel span:
{(task.units ?? 1) > 1 ? `${task.units}× ` : ""}{task.title}{showMethode && ` · ${methodeType}`}
```

Geen andere bestanden, geen database wijziging.
