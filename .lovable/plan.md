

# Fix: Leverancier type constraint mismatch

## Probleem
De `leveranciers` tabel heeft een check constraint die alleen deze waarden toestaat: `wholesaler`, `lokaal`, `overig`. De seed data stuurt `groothandel`, wat niet in de lijst staat.

## Oplossing
In `src/lib/seedDemoData.ts` de `type` waarde van beide leveranciers wijzigen van `"groothandel"` naar `"wholesaler"`.

### Bestand
| Bestand | Wijziging |
|---------|-----------|
| `src/lib/seedDemoData.ts` | `type: "groothandel"` → `type: "wholesaler"` (2 plekken, regel 44 en 53) |

Eén kleine tekst-fix, geen migraties nodig.

