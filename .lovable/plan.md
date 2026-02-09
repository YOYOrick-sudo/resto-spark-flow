

# Twee-koloms layout voor OnboardingDetail

Pas de detailpagina aan met een grid layout: links de tabs (Taken + Tijdlijn), rechts een permanente sidebar-kaart met contactinfo. De "Info" tab verdwijnt omdat die data altijd zichtbaar is in de sidebar.

---

## Wijzigingen in `src/pages/OnboardingDetail.tsx`

### 1. Tabs van 3 naar 2

Verwijder de "Info" tab:

```text
Oud:  [Taken] [Info] [Tijdlijn]
Nieuw: [Taken] [Tijdlijn]
```

### 2. Twee-koloms grid onder de tabs

Wrap de tab content en sidebar in:

```text
<div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
  <!-- Links: tab content (max-w-2xl) -->
  <!-- Rechts: sidebar kaart -->
</div>
```

### 3. Sidebar-kaart (rechterkolom)

Een `aside` met Nesto Panel styling (`bg-secondary rounded-xl border border-border/50 p-5 h-fit`) met:

- **Contactgegevens** header
- E-mail, telefoon (indien aanwezig), aanmelddatum
- Notities sectie (indien aanwezig)

Labels: `text-xs text-muted-foreground uppercase tracking-wide`
Waarden: `text-sm text-foreground`

### 4. CandidateActions buiten de grid

De sticky action bar blijft full-width onder de grid.

### 5. Responsief

Op mobiel (`< lg`) stapelt de sidebar onder de tab content.

---

## Samenvatting

| Bestand | Actie |
|---------|-------|
| `src/pages/OnboardingDetail.tsx` | Tabs 3→2, grid layout, sidebar kaart, CandidateInfo import kan weg |

Geen nieuwe bestanden nodig.

