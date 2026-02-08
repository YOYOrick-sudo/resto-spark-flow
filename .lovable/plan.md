

## Status badges reserveringen - Teal kleurenfamilie

### Samenvatting

De status badges krijgen een consistent kleursysteem gebaseerd op de Nesto teal kleur, met een duidelijke visuele progressie voor actieve statussen. Checked in en Seated worden visueel onderscheidend gemaakt.

### Kleursysteem

| Status | Dot | Tekst | Achtergrond | Border | Logica |
|---|---|---|---|---|---|
| **Pending** | #B8B5B0 (warm grijs) | text-muted-foreground | bg-muted/40 | - | Neutraal, wachtend |
| **Confirmed** | #1d979e (nesto teal) | text-primary | bg-primary/[0.08] | - | Licht teal = bevestigd |
| **Checked in** | #0D9488 (teal-600) | #0F766E | #F0FDFA | #99F6E4 | Teal + border = aangekomen |
| **Seated** | #14B8A6 (teal-500) | text-primary | bg-primary/15 | - | Vollere teal = aan tafel |
| **Completed** | #D1CCC7 (warm grijs) | text-muted-foreground opacity-50 | - | - | Vervaagd, klaar |
| **No-show** | #E87461 (warm koraal) | #C4503E | #FEF2F0 | #FECDC8 | Warm rood, negatief |
| **Cancelled** | geen | text-muted-foreground line-through | - | - | Doorgestreept, inactief |

De visuele progressie voor actieve statussen: Confirmed (licht teal) -> Checked in (teal + border) -> Seated (vollere teal achtergrond). Elk niveau wordt "steviger" zodat je in een oogopslag ziet waar een gast zich bevindt.

### Bestanden die wijzigen

**1. `src/data/reservations.ts` (regels 66-106)**

Het type van `reservationStatusConfig` wordt uitgebreid. Het `badgeVariant` veld wordt vervangen door: `showDot`, `textClass`, `bgClass`, en `borderClass`. Het bestaande `dotColor` veld blijft (wordt ook gebruikt door de losse StatusDot in de lijst).

**2. `src/components/reserveringen/ReservationListView.tsx` (regels 184-190)**

De `NestoBadge` voor de status wordt vervangen door een custom `span` die de nieuwe config-velden uitleest. De dot (w-2 h-2 rounded-full) wordt inline gerenderd binnen de badge. NestoBadge blijft in gebruik voor shift badges en walk-in labels.

**3. `docs/design/COLOR_PALETTE.md`**

Nieuwe sectie "STATUS BADGE COLORS" onderaan met het volledige kleursysteem en de design-rationale (teal-familie, warm grijs, warm koraal).

