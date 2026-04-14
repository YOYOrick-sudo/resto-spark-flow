

# Fix: Seed script robuuster maken tegen partial runs

## Probleem
De eerste seed-run faalde halverwege (na leveranciers + ingrediënten + recepten). Nu bestaat "Kooyman Grootverbruik" al, dus de idempotency-check slaat over, maar "Tomatenrelish" bestaat ook al → duplicate key error.

## Oplossing
**Twee aanpassingen in `src/lib/seedDemoData.ts`:**

1. **Bredere idempotency-check** — Controleer niet alleen leveranciers, maar ook recepten. Als één van beide al bestaat, meld "data bestaat al".

2. **"Opnieuw laden" optie** — Voeg een `force`-parameter toe die eerst alle demo data verwijdert (leveranciers, ingrediënten, recepten, gerechten, mep_tasks, voorraad_bewegingen met bekende namen) en dan opnieuw seed. De knop in Instellingen krijgt twee opties: "Demo data laden" en als data al bestaat "Demo data opnieuw laden" (met force=true).

### Alternatief (simpeler, aanbevolen)
Voeg aan de knop in Instellingen een extra actie toe: **"Demo data verwijderen"** die alle bekende seed-records verwijdert op basis van naam. Daarna kan de gebruiker opnieuw op "Demo data laden" klikken.

### Bestanden
| Bestand | Wijziging |
|---------|-----------|
| `src/lib/seedDemoData.ts` | Voeg `deleteDemoData(locationId)` functie toe die alle seed-records verwijdert (leveranciers, ingrediënten, recepten, gerechten, mep_tasks, voorraad_bewegingen). Breid idempotency-check uit naar meerdere tabellen. |
| `src/pages/SettingsVoorkeuren.tsx` | Voeg "Demo data verwijderen" knop toe naast de bestaande "Demo data laden" knop. |

### Aanpak delete-functie
Delete in omgekeerde volgorde van aanmaak (foreign keys):
1. `voorraad_bewegingen` (by ingredient name match)
2. `mep_tasks` / `mep_task_completions` (by recept link)
3. `gerecht_componenten` → `gerechten` (by naam)
4. `recept_ingredienten` → `recepten` (by naam)
5. `ingredient_allergenen` → `ingredienten` (by naam)
6. `leveranciers` (by naam)

Geen migraties nodig — alleen frontend code.

