

# Standaard Back-navigatie: `← [Parent]` Patroon

## Regel

| Diepte | Patroon | Voorbeeld |
|---|---|---|
| 1 niveau (detail pages) | `← Parent label` | `← Kaartbeheer` |
| 2+ niveaus (settings) | Breadcrumbs | `Instellingen > Reserveringen > Tafels` (al geïmplementeerd) |

## Wijzigingen

| Pagina | Huidig | Wordt |
|---|---|---|
| `KaartbeheerDetail.tsx` | `← Kaartbeheer > Gerechten > [naam]` (3 links) | `← Kaartbeheer` |
| `BereikDetailPage.tsx` | `← ghost button + PageHeader` | `← Analytics` |
| `ReviewsDetailPage.tsx` | `← ghost button + PageHeader` | `← Analytics` |
| `WasteDetailPage.tsx` | `← ghost button + PageHeader` | `← Analytics` |
| `CampaignBuilderPage.tsx` | Indien `← Terug` knop | `← Marketing` |
| `SocialPostCreatorPage.tsx` | Indien `← Terug` knop | `← Marketing` |

## Implementatie

Consistent patroon per pagina:

```tsx
<Link
  to="/kaartbeheer"
  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] w-fit"
>
  <ChevronLeft className="h-4 w-4" />
  <span>Kaartbeheer</span>
</Link>
```

- `ChevronLeft` (niet `ArrowLeft` — consistenter met ShadCN breadcrumb separator)
- `min-h-[44px]` voor touch target
- Paginatitel blijft als `<h1>` eronder (bestaande PageHeader of handmatig)

Settings-pagina's (`SettingsDetailLayout`) worden **niet** aangepast — die gebruiken al correct breadcrumbs.

