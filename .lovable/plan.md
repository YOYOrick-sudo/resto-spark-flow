

# Marketing Navigatie — Hernoemen voor Duidelijkheid

## Overzicht

Vier sidebar labels en bijbehorende page titles/descriptions worden hernoemt naar begrijpelijkere taal. Geen URL- of structuurwijzigingen.

---

## Wijzigingen per bestand

### 1. `src/lib/navigation.ts`

Vier labels aanpassen in de marketing subItems array:

| Huidig | Nieuw |
|--------|-------|
| `Segmenten` | `Doelgroepen` |
| `Contacten` | `Gasten` |
| `Social` | `Social Posts` |
| `Kalender` | `Content Kalender` |

### 2. `src/pages/marketing/SegmentsPage.tsx`

- PageHeader title: "Segmenten" → "Doelgroepen"
- PageHeader subtitle: "Groepeer gasten op basis van gedrag en kenmerken" → "Maak groepen van gasten voor gerichte campagnes."
- Button: "Nieuw segment" → "Nieuwe doelgroep" (2 plekken: PageHeader action + EmptyState action)
- EmptyState title: "Nog geen segmenten" → "Nog geen doelgroepen"
- EmptyState description: "Maak je eerste segment om gasten te groeperen." → "Maak je eerste doelgroep aan."
- Toast: "Segment bijgewerkt" → "Doelgroep bijgewerkt"
- Toast: "Segment aangemaakt" → "Doelgroep aangemaakt"
- Toast: "Segment verwijderd" → "Doelgroep verwijderd"
- ConfirmDialog title: "Segment verwijderen" → "Doelgroep verwijderen"
- ConfirmDialog description: "...dit segment..." → "...deze doelgroep..."

### 3. `src/pages/marketing/ContactsPage.tsx`

- PageHeader title: "Contacten" → "Gasten"
- PageHeader subtitle: "Beheer je gastenbestand en marketing voorkeuren" → "Alle gasten die marketing communicatie ontvangen."

### 4. `src/pages/marketing/SocialPostsPage.tsx`

- PageHeader title: "Social" → "Social Posts" (meerdere plekken in het bestand)

### 5. `src/pages/marketing/ContentCalendarPage.tsx`

- PageHeader title: "Kalender" → "Content Kalender"

---

## Wat NIET verandert

- URLs (routes blijven `/marketing/segmenten`, `/marketing/contacten`, etc.)
- Database tabellen en hooks (interne naamgeving ongewijzigd)
- Component bestandsnamen
- INSTELLINGEN > Marketing tabs

