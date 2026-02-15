

# NestoLogo in witte kleur

## Aandachtspunt: contrast

Het logo wordt overal wit. Op lichte achtergronden (sidebar `bg-secondary`, auth-pagina, 404-pagina) is wit onzichtbaar. Daarom worden de achtergronden van die plekken aangepast naar een donkere kleur zodat het witte logo goed zichtbaar is.

## Wijzigingen

| Bestand | Wat verandert |
|---------|---------------|
| `NestoLogo.tsx` | Woordmerk van `text-primary` (teal) naar `text-white`; icoon-rect van `fill-primary` naar `fill-white`, N-letter van `fill="white"` naar `fill="currentColor"` met `text-primary` (teal N op wit blokje) |
| `NestoSidebar.tsx` | Sidebar achtergrond van `bg-secondary` naar `bg-[hsl(220,15%,13%)]` (donker) zodat wit logo zichtbaar is. Tekst- en menu-item kleuren aanpassen voor contrast op donkere achtergrond |
| `AppLayout.tsx` | Mobiele header achtergrond donker maken (zelfde kleur als sidebar) |
| `Auth.tsx` | Pagina-achtergrond of logo-sectie donker maken zodat wit logo zichtbaar is |
| `NotFound.tsx` | Logo-sectie of achtergrond aanpassen voor contrast |
| `NestoErrorBoundary.tsx` | Geen logo aanwezig, geen wijziging nodig |

## Technisch detail

### NestoLogo.tsx

```text
Icoon:  rect fill="white" (was fill-primary)
        path fill wordt teal (zodat de N zichtbaar is op het witte vlak)
Tekst:  "nesto" wordt text-white (was text-primary)
```

### NestoSidebar.tsx

De sidebar krijgt een donkere achtergrond. Menu-items, labels, chevrons en active states worden aangepast naar lichte kleuren die werken op de donkere achtergrond. De hover- en active-states gebruiken `white/10` en `white/20` in plaats van de huidige lichte kleuren.

### Auth.tsx en NotFound.tsx

De logo-secties krijgen een donkere achtergrond of het logo wordt op een donker vlak geplaatst zodat het witte woordmerk leesbaar blijft.

