

# Manage Pagina — Enterprise Upgrade + Restaurant Branding

## Wat verandert

De huidige beheer pagina is functioneel maar visueel basic. We upgraden naar de Nesto enterprise-stijl (matching de booking widget esthetiek) en voegen restaurant branding toe.

## 1. Backend: Restaurant naam + logo meegeven

**Bestand:** `supabase/functions/public-booking-api/index.ts` (handleManageGet)

Na het ophalen van de reservering, ook de locatie-naam en het logo ophalen uit `locations` en `communication_settings`:

```typescript
const [{ data: loc }, { data: commSettings }] = await Promise.all([
  admin.from('locations').select('name').eq('id', data.location_id).single(),
  admin.from('communication_settings').select('logo_url').eq('location_id', data.location_id).maybeSingle(),
]);
```

Toevoegen aan de response:
```typescript
return jsonResponse({
  location_id: data.location_id,
  restaurant_name: loc?.name ?? null,
  logo_url: commSettings?.logo_url ?? null,
  reservation: { ... },
  ...
});
```

## 2. Frontend: Volledige redesign

**Bestand:** `src/pages/ManageReservation.tsx`

### Structuur (top-to-bottom):

1. **Restaurant logo** — gecentreerd bovenaan de kaart, `max-h-12` met fallback (restaurantnaam als tekst als er geen logo is)
2. **Gastnaam + status badge** — naam prominent, badge ernaast
3. **Reserveringsdetails** — datum, tijd (zonder seconden), gasten, ticket — met Lucide iconen in de widget-stijl
4. **Acties** — rounded-2xl knoppen matching de widget CTA-stijl
5. **"Powered by Nesto"** footer — al aanwezig, maar met het NestoLogo component (icoon-only, klein) voor professionelere uitstraling

### Visuele stijl:
- Achtergrond: `#FAFAFA` (matching widget)
- Font: Inter via Tailwind defaults
- Kaart: `bg-white rounded-2xl shadow-sm` (geen border, schaduw als afbakening)
- Knoppen: `rounded-2xl` met hover/active states (matching widget CTA's)
- Tijdformat: `HH:mm` (seconden strippen)
- Status badges: `rounded-full` met subtielere kleuren (niet pure wit op felgroen, maar lichtere tints)

### Interface update:
```typescript
interface ManageData {
  location_id: string;
  restaurant_name: string | null;  // nieuw
  logo_url: string | null;         // nieuw
  reservation: ReservationData;
  cancel_policy: any;
  can_cancel: boolean;
  can_modify: boolean;
}
```

### Header sectie (nieuw):
```tsx
{/* Restaurant branding */}
<div className="pt-6 pb-4 flex flex-col items-center gap-3 border-b border-gray-100">
  {data.logo_url ? (
    <img src={data.logo_url} alt={data.restaurant_name ?? ''} className="max-h-12 max-w-[200px] object-contain" />
  ) : data.restaurant_name ? (
    <span className="text-base font-semibold text-gray-800">{data.restaurant_name}</span>
  ) : null}
</div>
```

### Footer (upgrade):
```tsx
<footer className="mt-6 text-center flex items-center justify-center gap-1.5">
  <span className="text-xs text-gray-300">Powered by</span>
  <NestoLogo size="sm" showWordmark showIcon={false} />
</footer>
```

Hiervoor wordt `NestoLogo` geimporteerd uit `@/components/polar/NestoLogo`. De primary kleur van NestoLogo wordt via een inline style override naar `text-gray-400` gezet zodat het subtiel blijft.

## Samenvatting wijzigingen

| Bestand | Wat |
|---------|-----|
| `supabase/functions/public-booking-api/index.ts` | Restaurant naam + logo toevoegen aan manage GET response |
| `src/pages/ManageReservation.tsx` | Volledige visuele upgrade: branding, enterprise styling, tijdformat fix, Powered by Nesto |

