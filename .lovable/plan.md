

# Enterprise Visual Polish - Email Template Cards & Grote Cards

## Probleem

De email template cards (Ontvangstbevestiging, Afwijzing, etc.) voelen visueel "vaag" aan ondanks de enterprise token-updates. De oorzaken:

1. **Alle 9 template cards zijn altijd volledig open** met grote textarea's -- dit creëert een overweldigende muur van lege formulieren
2. **Geen visuele status-indicatie** of een template al geconfigureerd is of nog leeg
3. **De `bg-secondary/50` form grouping** heeft minimaal contrast met de card achtergrond, waardoor de structuur vervalt
4. **Textarea's zijn 160px hoog** zelfs wanneer leeg -- veel visuele ruimte zonder inhoud

## Oplossing: Collapsible Template Cards

Dezelfde aanpak als PhaseConfigCard: cards zijn standaard **ingeklapt** met een compacte samenvatting, en klappen uit voor bewerking.

### Wijzigingen aan `EmailTemplateEditor.tsx`

**Collapsed state (standaard):**
- Compacte rij: template naam + beschrijving + status badge
- Status badge toont "Geconfigureerd" (teal) of "Niet ingesteld" (amber) op basis van of subject en body ingevuld zijn
- Klik op de card header klapt de editor uit
- Template key badge blijft zichtbaar (rechts)

**Expanded state (na klik):**
- Huidige form grouping block met subject + body textarea
- Variable chips
- Preview toggle
- Textarea hoogte verlaagd naar `min-h-[120px]` (was 160px)

**Visuele verbeteringen:**
- Header wordt clickable met chevron icon (consistent met PhaseConfigCard)
- Hover state op collapsed header: `hover:bg-accent/40 duration-150`
- Status dot naast de titel: groene dot als geconfigureerd, amber als leeg
- `border-b border-border/50` separator tussen header en content (alleen in expanded)

### Wijzigingen aan `EmailTemplatesSection.tsx`

- Geen structurele wijzigingen nodig, delegeert aan EmailTemplateEditor

### Wijzigingen aan `PhaseConfigCard.tsx`

- Status dot toevoegen: groene dot als fase actief, grijze dot als inactief
- Consistent met de email template status indicator

---

## Technische details

### EmailTemplateEditor.tsx -- Collapsed/Expanded patroon

```text
COLLAPSED:
+----------------------------------------------------------+
| > Ontvangstbevestiging              [confirmation]       |
|   Nieuwe kandidaat        * Geconfigureerd               |
+----------------------------------------------------------+

EXPANDED:
+----------------------------------------------------------+
| v Ontvangstbevestiging              [confirmation]       |
|   Nieuwe kandidaat        * Geconfigureerd               |
|----------------------------------------------------------|
|   +--------------------------------------------------+   |
|   | Onderwerp: [input field]                         |   |
|   | Body: [textarea]                                 |   |
|   +--------------------------------------------------+   |
|   Variabelen: [voornaam] [achternaam] [vestiging]...     |
|   [Preview tonen v]                                      |
+----------------------------------------------------------+
```

### Status badge logica

```text
- Subject EN body ingevuld -> NestoBadge variant="primary" met dot: "Geconfigureerd"
- Subject OF body leeg -> NestoBadge variant="warning" met dot: "Niet ingesteld"
```

### Specifieke code-wijzigingen

1. `EmailTemplateEditor.tsx`:
   - Nieuwe state: `const [expanded, setExpanded] = useState(false)`
   - Status check: `const isConfigured = template.subject.trim() !== '' && template.body.trim() !== ''`
   - Collapsed header als clickable div met chevron + status badge
   - Form content wrapped in `{expanded && (...)}`
   - Textarea `min-h-[160px]` wordt `min-h-[120px]`

2. `PhaseConfigCard.tsx`:
   - StatusDot component toevoegen naast fase naam (groen=actief, grijs=inactief)

---

## Resultaat

- De pagina wordt visueel **veel compacter** -- 9 ingeklapte cards in plaats van 9 grote open formulieren
- **Direct zichtbaar** welke templates al geconfigureerd zijn (status badges)
- **Consistent patroon** met PhaseConfigCard (collapsible cards)
- Behoudt alle enterprise tokens die eerder zijn toegepast (tabular-nums, focus-visible, transitions)

