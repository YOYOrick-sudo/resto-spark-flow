

# Fix: Verberg status badge bij Open en Voltooide taken

## Wijziging

Eén bestand: `src/components/mep/MepTaskRow.tsx`

Regel 95-98: de status badge wordt nu altijd getoond. Vervang door een conditie:

- `pending` → geen badge
- `in_progress` → "Bezig" badge (primary variant)
- `completed` → geen badge (doorgestreepte tekst is voldoende)
- `cancelled` → "Geannuleerd" badge (default variant, blijft — want doorstreping + label maakt duidelijk dat het bewust geannuleerd is)

```typescript
{/* Status badge — alleen bij in_progress en cancelled */}
{task.status === "in_progress" && (
  <NestoBadge variant="primary" size="sm">Bezig</NestoBadge>
)}
{task.status === "cancelled" && (
  <NestoBadge variant="default" size="sm">Geannuleerd</NestoBadge>
)}
```

De `STATUS_CONFIG` map kan blijven bestaan (wordt elders niet gebruikt, maar kost niets). Geen andere bestanden wijzigen.

