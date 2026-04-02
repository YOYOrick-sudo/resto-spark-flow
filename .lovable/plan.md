

# Allergenen als afkortingen in reserveringslijst

## Wat verandert

Een nieuwe kolom **Dieet** toevoegen tussen Shift/Ticket en Status. Toont compacte afkortingen van allergenen en dieetvoorkeuren.

### Afkortingen

| Allergen | Afkorting |
|---|---|
| Glutenvrij | GV |
| Lactosevrij | LV |
| Noten | NO |
| Schaaldieren | SD |
| Eieren | EI |
| Vis | VI |
| Pinda's | PN |
| Soja | SO |
| Selderij | SE |
| Mosterd | MO |
| Sesam | SS |
| Sulfieten | SU |
| Lupine | LU |
| Weekdieren | WD |
| Vegetarisch | VEG |
| Vegan | VGN |

### Grid aanpassing

Huidige: `[12px_1fr_56px_72px_160px_120px_80px_32px]` (8 kolommen)
Nieuw: `[12px_1fr_56px_72px_160px_100px_120px_80px_32px]` (9 kolommen)

De nieuwe kolom (100px) komt na Shift/Ticket. Toont kleine oranje pills met afkortingen, max 3 zichtbaar + "+N" overflow. Tooltip toont volledige namen.

De huidige inline allergie-indicator (⚠️ badge naast naam) wordt verwijderd — de aparte kolom vervangt die.

### Bestanden

| Bestand | Wijziging |
|---|---|
| `src/components/reserveringen/ReservationListView.tsx` | Nieuwe ALLERGEN_ABBR map, extra kolom in GRID_COLS, ColumnHeader, ReservationRow en WaitlistInlineRow |

