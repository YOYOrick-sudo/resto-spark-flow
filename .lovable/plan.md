

# Sidebar font-size aanpassing

## Wat verandert
De menu-items in NestoSidebar.tsx krijgen `text-[13px]` (was `text-xs` / 12px) en `py-1.5` (was `py-[5px]`). Dit komt dichter bij de referentie-afbeelding (~14px met ruime spacing) maar blijft compact genoeg voor de Nesto sidebar met sub-items.

## Technisch

**Bestand:** `src/components/layout/NestoSidebar.tsx`

5 plekken worden aangepast (dezelfde als de vorige wijziging):

| Regel | Element | Wijziging |
|-------|---------|-----------|
| 156 | Expandable group trigger | `text-xs py-[5px]` wordt `text-[13px] py-1.5` |
| 184 | Disabled sub-item | idem |
| 197 | Active sub-item | idem |
| 215 | Disabled item | idem |
| 225 | Regular item | idem |

Geen andere bestanden worden geraakt.
