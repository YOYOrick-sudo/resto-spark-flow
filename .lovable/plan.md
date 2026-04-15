

# Plan: Assistent UX — Meldingen Verbeteren

## Samenvatting

Drie verbeteringen: (1) overstocked melding versimpelen + extra filters, (2) meldingen groeperen per module met sectie-headers, (3) beschrijvingen inkorten naar max 2 items. Plus suggestie: automatisch de ernstigste melding bovenaan zetten zodat de kok altijd het belangrijkste eerst ziet.

---

## Suggestie van Lovable

**Melding-prioriteit sortering.** Nu staan meldingen in vaste volgorde (verlopen → bijna verlopen → voorraad nul → laag → overschot). Maar als er €200 aan vis verlopen is en 1 ingrediënt "onder minimum" staat, wil je de vis bovenaan. Sorteer meldingen automatisch op severity (error > warning > info) en dan op waarde (hoogste eerst). Geen extra UI — gewoon de juiste volgorde. De kok ziet altijd het belangrijkste eerst zonder zelf te moeten scannen.

---

## Wijzigingen

### 1. `src/hooks/useVoorraadOverschot.ts` — Extra filters

Voeg `categorie` toe aan de select query en filter uit:
- `opslag_type === "droog"` (bestaand)
- `categorie` bevat "Conserven" of "Droog"
- Kaas-hard categorieën (geen kolom `houdbaarheid_dagen` in DB, dus filter op categorie-patroon)

```typescript
// Bestaande select uitbreiden met categorie
.select("id, naam, voorraad, eenheid, kostprijs, opslag_type, categorie")

// Filter uitbreiden
const EXCLUDE_CATEGORIES = /conserven|droog|hard.?kaas/i;

.filter((ig) => {
  if (ig.opslag_type === "droog") return false;
  if (ig.categorie && EXCLUDE_CATEGORIES.test(ig.categorie)) return false;
  // ...rest bestaande logica
})
```

### 2. `src/hooks/useKeukenMeldingen.ts` — Overstocked + beschrijvingen

**Overstocked melding:**
- Titel: `"Hoge voorraad"` (was: `"X ingrediënten overstocked"`)
- Beschrijving: max 2 items, alleen naam + hoeveelheid (geen ratio)
- Actie-knop: `"Personeelsmaaltijd bedenken"`

**Alle beschrijvingen:** helper functie voor max 2 items + "+N meer":

```typescript
function formatItemList(items: { label: string }[], max = 2): string {
  const shown = items.slice(0, max).map(i => i.label).join(" · ");
  const rest = items.length - max;
  return rest > 0 ? `${shown} · +${rest} meer` : shown;
}
```

Toegepast op:
- **Verlopen:** `"Kipfilet — 4.5 kg · Tomaten — 6.8 kg · +3 meer"`
- **Bijna verlopen:** `"Kipfilet — 4.5 kg, morgen · Slagroom — 2 L, over 2 dagen · +1 meer"`
- **Voorraad nul:** `"Basilicum · Olijfolie · +4 meer"` (al max 5, nu max 2)
- **Voorraad laag:** `"Basilicum (0.1 kg) · Uien (2 kg) · +3 meer"`
- **Overschot:** `"Kipfilet — 4.5 kg · Tomaten — 6.8 kg · +2 meer"` (geen ratio)

**Sortering:** meldingen sorteren op severity (error=0, warning=1, info=2) en dan waarde (desc):

```typescript
meldingen.sort((a, b) => {
  const sevOrder = { error: 0, warning: 1, info: 2 };
  const diff = sevOrder[a.severity] - sevOrder[b.severity];
  return diff !== 0 ? diff : (b.waarde ?? 0) - (a.waarde ?? 0);
});
```

### 3. `src/components/assistent/KeukenSectie.tsx` → Verwijderen

KeukenSectie wordt vervangen door een generieke `MeldingenSecties` component die per module groepeert.

### 4. Nieuw: `src/components/assistent/MeldingenSecties.tsx`

Generieke component die meldingen per module toont met sectie-headers:

```typescript
import { useState } from "react";
import { ChefHat, CalendarDays } from "lucide-react";
import { useKeukenMeldingen, type KeukenMelding } from "@/hooks/useKeukenMeldingen";
import { useSignals } from "@/hooks/useSignals";
import { KeukenMeldingCard } from "./KeukenMeldingCard";
import { PersoneelsmaaltijdModal } from "@/components/mep/PersoneelsmaaltijdModal";

interface ModuleSectie {
  key: string;
  label: string;
  icon: typeof ChefHat;
  meldingen: KeukenMelding[];
}

export function MeldingenSecties() {
  const keukenMeldingen = useKeukenMeldingen();
  const { signals } = useSignals();
  const [maaltijdOpen, setMaaltijdOpen] = useState(false);

  // Build reservation signals as KeukenMelding format
  const reserveringMeldingen: KeukenMelding[] = signals
    .filter(s => s.module === 'reserveringen' && s.status === 'active')
    .map(s => ({
      type: s.signal_type as any,
      severity: s.severity === 'ok' ? 'info' : s.severity,
      titel: s.title,
      beschrijving: s.message ?? '',
      actie_label: s.action_path ? 'Bekijken' : undefined,
      actie_path: s.action_path ?? undefined,
    }));

  const secties: ModuleSectie[] = [];

  if (keukenMeldingen.length > 0) {
    secties.push({
      key: "keuken",
      label: "Keuken",
      icon: ChefHat,
      meldingen: keukenMeldingen,
    });
  }

  if (reserveringMeldingen.length > 0) {
    secties.push({
      key: "reserveringen",
      label: "Reserveringen",
      icon: CalendarDays,
      meldingen: reserveringMeldingen,
    });
  }

  if (secties.length === 0) return null;

  return (
    <>
      {secties.map((sectie) => (
        <div key={sectie.key} className="space-y-3">
          <div className="flex items-center gap-2">
            <sectie.icon className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {sectie.label}
            </h3>
          </div>
          {sectie.meldingen.map((melding, idx) => (
            <KeukenMeldingCard
              key={`${sectie.key}-${melding.type}-${idx}`}
              melding={melding}
              onAction={
                melding.actie_label === "Personeelsmaaltijd bedenken"
                  ? () => setMaaltijdOpen(true)
                  : undefined
              }
            />
          ))}
        </div>
      ))}
      <PersoneelsmaaltijdModal open={maaltijdOpen} onOpenChange={setMaaltijdOpen} />
    </>
  );
}
```

### 5. `src/components/assistant/OverviewTab.tsx` — KeukenSectie → MeldingenSecties

Regel 17: import wijzigen. Regel 323: component wijzigen.

```typescript
// Was:
import { KeukenSectie } from '@/components/assistent/KeukenSectie';
// Wordt:
import { MeldingenSecties } from '@/components/assistent/MeldingenSecties';

// Regel 323, was:
<KeukenSectie />
// Wordt:
<MeldingenSecties />
```

**Urgent signals duplicatie voorkomen:** De urgentSignals map (r.302-318) toont al reservering-signals als losse kaarten. Filter `reserveringen` module uit urgentSignals zodat ze alleen onder de sectie-header verschijnen:

```typescript
const urgentSignals = useMemo(
  () => signals.filter((s) => 
    s.actionable && 
    (s.severity === 'error' || s.severity === 'warning') &&
    s.module !== 'reserveringen' // nu getoond in MeldingenSecties
  ),
  [signals]
);
```

---

## Volledige code per bestand

### `src/hooks/useVoorraadOverschot.ts`

```typescript
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { subWeeks, format } from "date-fns";

export interface OverstockedItem {
  id: string;
  naam: string;
  hoeveelheid: number;
  eenheid: string;
  geschatte_waarde: number;
  ratio: number;
}

const EXCLUDE_OVERSTOCKED_CATEGORIES = /conserven|droog|hard.?kaas/i;

export function useVoorraadOverschot(minWaarde: number = 10) {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ["voorraad-overschot", locationId, minWaarde],
    queryFn: async (): Promise<OverstockedItem[]> => {
      const { data: ingredients, error } = await supabase
        .from("ingredienten")
        .select("id, naam, voorraad, eenheid, kostprijs, opslag_type, categorie")
        .eq("location_id", locationId!)
        .eq("is_archived", false)
        .gt("voorraad", 0);
      if (error) throw error;

      const vierWekenGeleden = format(subWeeks(new Date(), 4), "yyyy-MM-dd");
      const { data: bewegingen } = await supabase
        .from("voorraad_bewegingen")
        .select("ingredient_id, hoeveelheid")
        .in("type", ["WASTE", "OUT"])
        .gte("created_at", `${vierWekenGeleden}T00:00:00`);

      const weekVerbruik = new Map<string, number>();
      for (const b of bewegingen ?? []) {
        const curr = weekVerbruik.get(b.ingredient_id) ?? 0;
        weekVerbruik.set(b.ingredient_id, curr + Math.abs(b.hoeveelheid ?? 0));
      }

      const items: OverstockedItem[] = (ingredients ?? [])
        .filter((ig) => {
          if (ig.opslag_type === "droog") return false;
          if (ig.categorie && EXCLUDE_OVERSTOCKED_CATEGORIES.test(ig.categorie)) return false;
          const totaalVerbruik = weekVerbruik.get(ig.id) ?? 0;
          const gemiddeldPerWeek = totaalVerbruik / 4;
          if (gemiddeldPerWeek <= 0) return false;
          const ratio = ig.voorraad / gemiddeldPerWeek;
          const waarde = ig.voorraad * (ig.kostprijs ?? 0);
          return ratio > 5 && waarde >= minWaarde;
        })
        .map((ig) => {
          const totaalVerbruik = weekVerbruik.get(ig.id) ?? 0;
          const gemiddeldPerWeek = totaalVerbruik / 4;
          return {
            id: ig.id,
            naam: ig.naam,
            hoeveelheid: ig.voorraad,
            eenheid: ig.eenheid,
            geschatte_waarde: Math.round(ig.voorraad * (ig.kostprijs ?? 0) * 100) / 100,
            ratio: Math.round((ig.voorraad / gemiddeldPerWeek) * 10) / 10,
          };
        })
        .sort((a, b) => b.geschatte_waarde - a.geschatte_waarde);

      return items;
    },
    enabled: !!locationId,
    refetchInterval: 10 * 60 * 1000,
  });
}
```

### `src/hooks/useKeukenMeldingen.ts`

```typescript
import { useMemo } from "react";
import { useBijnaVerlopen, type BijnaVerlopenItem } from "./useBijnaVerlopen";
import { useVoorraadOverschot, type OverstockedItem } from "./useVoorraadOverschot";
import { useVoorraadNul } from "./useVoorraadNul";
import { useKeukenSettings } from "./useKeukenSettings";

export interface KeukenMelding {
  type: "bijna_verlopen" | "verlopen" | "voorraad_nul" | "voorraad_laag" | "overschot" | string;
  severity: "error" | "warning" | "info";
  titel: string;
  beschrijving: string;
  waarde?: number;
  actie_label?: string;
  actie_path?: string;
  items?: BijnaVerlopenItem[];
  overstockedItems?: OverstockedItem[];
}

function formatItemList(
  items: { label: string }[],
  max = 2
): string {
  const shown = items.slice(0, max).map((i) => i.label).join(" · ");
  const rest = items.length - max;
  return rest > 0 ? `${shown} · +${rest} meer` : shown;
}

export function useKeukenMeldingen() {
  const { data: settings } = useKeukenSettings();
  const minWaardeVerlopen = (settings as any)?.assistent_min_waarde_verlopen ?? 5;
  const minWaardeOverschot = (settings as any)?.assistent_min_waarde_overschot ?? 10;

  const { data: bijnaVerlopen = [] } = useBijnaVerlopen(2);
  const { data: overstocked = [] } = useVoorraadOverschot(minWaardeOverschot);
  const { data: voorraadData } = useVoorraadNul();

  return useMemo(() => {
    const meldingen: KeukenMelding[] = [];

    // Verlopen items
    const verlopen = bijnaVerlopen.filter((i) => i.dagen_resterend <= 0);
    if (verlopen.length > 0) {
      const totaleWaarde = verlopen.reduce((s, i) => s + i.geschatte_waarde, 0);
      meldingen.push({
        type: "verlopen",
        severity: "error",
        titel: `${verlopen.length} item${verlopen.length > 1 ? "s" : ""} verlopen`,
        beschrijving: formatItemList(
          verlopen.map((i) => ({ label: `${i.productnaam} — ${i.geschatte_hoeveelheid}` }))
        ),
        waarde: totaleWaarde,
        actie_label: "Personeelsmaaltijd bedenken",
        items: verlopen,
      });
    }

    // Bijna verlopen
    const bijna = bijnaVerlopen.filter((i) => i.dagen_resterend > 0);
    if (bijna.length > 0) {
      const totaleWaarde = bijna.reduce((s, i) => s + i.geschatte_waarde, 0);
      if (totaleWaarde >= minWaardeVerlopen) {
        meldingen.push({
          type: "bijna_verlopen",
          severity: "warning",
          titel: `${bijna.length} item${bijna.length > 1 ? "s" : ""} verloop${bijna.length > 1 ? "en" : "t"} binnenkort`,
          beschrijving: formatItemList(
            bijna.map((i) => ({
              label: `${i.productnaam} — ${i.geschatte_hoeveelheid}, ${i.dagen_resterend === 1 ? "morgen" : `over ${i.dagen_resterend} dagen`}`,
            }))
          ),
          waarde: totaleWaarde,
          actie_label: "Personeelsmaaltijd bedenken",
          items: bijna,
        });
      }
    }

    // Voorraad nul
    const nul = voorraadData?.nul ?? [];
    if (nul.length > 0) {
      meldingen.push({
        type: "voorraad_nul",
        severity: "error",
        titel: `${nul.length} ingrediënt${nul.length > 1 ? "en" : ""} op`,
        beschrijving: formatItemList(nul.map((i) => ({ label: i.naam }))),
        actie_label: "Bestelling aanmaken",
        actie_path: "/inkoop",
      });
    }

    // Voorraad laag
    const laag = voorraadData?.laag ?? [];
    if (laag.length > 0) {
      meldingen.push({
        type: "voorraad_laag",
        severity: "warning",
        titel: `${laag.length} ingrediënt${laag.length > 1 ? "en" : ""} onder minimum`,
        beschrijving: formatItemList(
          laag.map((i) => ({ label: `${i.naam} (${i.voorraad} ${i.eenheid})` }))
        ),
        actie_label: "Bestelling aanmaken",
        actie_path: "/inkoop",
      });
    }

    // Overstocked — versimpeld
    if (overstocked.length > 0) {
      meldingen.push({
        type: "overschot",
        severity: "info",
        titel: "Hoge voorraad",
        beschrijving: formatItemList(
          overstocked.map((i) => ({ label: `${i.naam} — ${i.hoeveelheid} ${i.eenheid}` }))
        ),
        actie_label: "Personeelsmaaltijd bedenken",
        overstockedItems: overstocked,
      });
    }

    // Sort: error > warning > info, then by value desc
    const sevOrder: Record<string, number> = { error: 0, warning: 1, info: 2 };
    meldingen.sort((a, b) => {
      const diff = (sevOrder[a.severity] ?? 2) - (sevOrder[b.severity] ?? 2);
      return diff !== 0 ? diff : (b.waarde ?? 0) - (a.waarde ?? 0);
    });

    return meldingen;
  }, [bijnaVerlopen, overstocked, voorraadData, minWaardeVerlopen, minWaardeOverschot]);
}
```

### `src/components/assistent/MeldingenSecties.tsx` (nieuw)

```typescript
import { useState } from "react";
import { ChefHat, CalendarDays } from "lucide-react";
import { useKeukenMeldingen, type KeukenMelding } from "@/hooks/useKeukenMeldingen";
import { useSignals } from "@/hooks/useSignals";
import { KeukenMeldingCard } from "./KeukenMeldingCard";
import { PersoneelsmaaltijdModal } from "@/components/mep/PersoneelsmaaltijdModal";
import type { LucideIcon } from "lucide-react";

interface ModuleSectie {
  key: string;
  label: string;
  icon: LucideIcon;
  meldingen: KeukenMelding[];
}

export function MeldingenSecties() {
  const keukenMeldingen = useKeukenMeldingen();
  const { signals } = useSignals();
  const [maaltijdOpen, setMaaltijdOpen] = useState(false);

  // Map reservation signals to melding format
  const reserveringMeldingen: KeukenMelding[] = signals
    .filter((s) => s.module === "reserveringen" && s.status === "active")
    .map((s) => ({
      type: s.signal_type,
      severity: s.severity === "ok" ? ("info" as const) : (s.severity as "error" | "warning" | "info"),
      titel: s.title,
      beschrijving: s.message ?? "",
      actie_label: s.action_path ? "Bekijken" : undefined,
      actie_path: s.action_path ?? undefined,
    }));

  const secties: ModuleSectie[] = [];

  if (keukenMeldingen.length > 0) {
    secties.push({ key: "keuken", label: "Keuken", icon: ChefHat, meldingen: keukenMeldingen });
  }

  if (reserveringMeldingen.length > 0) {
    secties.push({ key: "reserveringen", label: "Reserveringen", icon: CalendarDays, meldingen: reserveringMeldingen });
  }

  if (secties.length === 0) return null;

  return (
    <>
      {secties.map((sectie) => (
        <div key={sectie.key} className="space-y-3">
          <div className="flex items-center gap-2">
            <sectie.icon className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {sectie.label}
            </h3>
          </div>
          {sectie.meldingen.map((melding, idx) => (
            <KeukenMeldingCard
              key={`${sectie.key}-${melding.type}-${idx}`}
              melding={melding}
              onAction={
                melding.actie_label === "Personeelsmaaltijd bedenken"
                  ? () => setMaaltijdOpen(true)
                  : undefined
              }
            />
          ))}
        </div>
      ))}
      <PersoneelsmaaltijdModal open={maaltijdOpen} onOpenChange={setMaaltijdOpen} />
    </>
  );
}
```

### `src/components/assistant/OverviewTab.tsx` — wijzigingen

**Regel 17:** import wijzigen:
```typescript
import { MeldingenSecties } from '@/components/assistent/MeldingenSecties';
```

**Regel 104-107:** reservering-signals uitsluiten uit urgentSignals (nu in secties):
```typescript
const urgentSignals = useMemo(
  () => signals.filter((s) => s.actionable && (s.severity === 'error' || s.severity === 'warning') && s.module !== 'reserveringen'),
  [signals]
);
```

**Regel 323:**
```typescript
<MeldingenSecties />
```

---

## Bestanden

| Bestand | Actie |
|---------|-------|
| `src/hooks/useVoorraadOverschot.ts` | +categorie select, +EXCLUDE filter |
| `src/hooks/useKeukenMeldingen.ts` | formatItemList helper, overschot versimpeld, sortering |
| `src/components/assistent/MeldingenSecties.tsx` | Nieuw — generieke module-secties |
| `src/components/assistant/OverviewTab.tsx` | KeukenSectie → MeldingenSecties, filter reserveringen uit urgentSignals |
| `src/components/assistent/KeukenSectie.tsx` | Niet meer geïmporteerd (kan later verwijderd) |

