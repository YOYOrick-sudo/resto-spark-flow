

# Logo thema-bewust maken: wit in dark mode, zwart in light mode

## Overzicht

Het NestoLogo component wordt thema-bewust. In dark mode blijft alles zoals nu (wit woordmerk, wit icoon met teal N). In light mode wordt het woordmerk zwart en het icoon zwart met teal N.

De sidebar blijft altijd donker (enterprise look) en gebruikt altijd de witte variant. De overige plekken (Auth, 404) worden teruggebracht naar thema-bewuste achtergronden.

## Wijzigingen

| Bestand | Wat verandert |
|---------|-----------|
| `NestoLogo.tsx` | Woordmerk: `text-white` wordt `text-foreground` (zwart in light, wit in dark). Icoon rect: `fill="white"` wordt `fill="currentColor"` met `text-foreground`. Nieuwe optionele `variant` prop: `"auto"` (volgt thema, standaard) of `"white"` (altijd wit, voor donkere achtergronden). |
| `NestoSidebar.tsx` | Logo aanroep krijgt `variant="white"` zodat het altijd wit blijft op de donkere sidebar. |
| `AppLayout.tsx` | Mobiele header logo krijgt `variant="white"` (header blijft donker). |
| `Auth.tsx` | Donkere logo-sectie verwijderen. Logo gebruikt standaard `variant="auto"` zodat het meebeweegt met het thema. Achtergrond wordt weer `bg-background`. |
| `NotFound.tsx` | Terug naar `bg-background` met thema-bewuste kleuren. Logo gebruikt standaard variant. |

## Technisch detail

### NestoLogo.tsx

- Nieuwe prop: `variant?: 'auto' | 'white'`
- `variant="white"`: huidige gedrag (alles wit, teal N)
- `variant="auto"` (standaard): icoon en woordmerk gebruiken `text-foreground` (volgt thema automatisch via Tailwind dark mode classes)
- Het icoon-rect krijgt `className` met de juiste kleur, de N-path blijft `fill-primary`

### Sidebar en mobiele header

Geen visuele verandering: deze blijven donker en gebruiken `variant="white"`.

### Auth.tsx en NotFound.tsx

Deze pagina's worden weer thema-bewust: `bg-background`, `text-foreground`. Het logo past automatisch mee.

