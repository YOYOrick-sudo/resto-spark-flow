

# Fix: MEP taken deadline format

## Probleem
De `deadline` kolom in `mep_tasks` is van type `time`, maar het seed script stuurt een volledige datetime string (`"2026-04-14T11:00:00"`). Postgres verwacht alleen een tijdstring zoals `"11:00:00"`.

## Oplossing
In `src/lib/seedDemoData.ts` (regels 511-515): verander de `deadline` waarden van `${today}T11:00:00` naar alleen het tijdsdeel (`"11:00:00"`, `"10:30:00"`, `"16:00:00"`, `"12:00:00"`).

| Regel | Huidig | Nieuw |
|-------|--------|-------|
| 511 | `deadline: \`${today}T11:00:00\`` | `deadline: "11:00:00"` |
| 512 | `deadline: \`${today}T10:30:00\`` | `deadline: "10:30:00"` |
| 514 | `deadline: \`${today}T16:00:00\`` | `deadline: "16:00:00"` |
| 515 | `deadline: \`${today}T12:00:00\`` | `deadline: "12:00:00"` |

Eén bestand, vier kleine tekst-fixes.

