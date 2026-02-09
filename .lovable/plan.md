

# Fix: Split View layout polish

Zes concrete fixes voor het detail panel en de taken-weergave.

---

## Wijzigingen

### 1. Dubbele naam verwijderen

Het `DetailPanel` toont de naam in de header (via `title` prop), en `CandidateHeader` binnen de content toont dezelfde naam opnieuw.

**Oplossing**: Verwijder de `title` prop uit de `DetailPanel` aanroep in `OnboardingPage.tsx`. Het panel header toont dan alleen de close-knop (rechts uitgelijnd). De naam blijft zichtbaar in de `CandidateHeader` component binnen de content.

**Bestand**: `OnboardingPage.tsx` -- verwijder `title={...}` van DetailPanel.

---

### 2. Panel header: alleen close-knop

In `DetailPanel.tsx`, wanneer er geen `title` is, moet de close-knop rechts uitgelijnd staan met `ml-auto`. Huidige `justify-between` werkt alleen als er twee elementen zijn.

**Bestand**: `DetailPanel.tsx` -- voeg `ml-auto` toe aan de close-knop styling zodat deze altijd rechts staat, ook zonder titel.

---

### 3. Eerdere fasen: sortering omdraaien (meest recent eerst)

In `PhaseTaskList.tsx` worden eerdere fasen gesorteerd op `sortOrder` ascending (fase 1 eerst). De gebruiker wil de meest recente fase bovenaan zien.

**Bestand**: `PhaseTaskList.tsx` -- sorteer `previousGroups` descending: `.sort((a, b) => b.sortOrder - a.sortOrder)` zodat fase 4 boven fase 3 staat, etc.

---

### 4. "Doorgaan" knop kleuren bevestigen

De `NestoButton` default variant is `primary` (teal). De huidige code gebruikt geen `variant` prop op de Doorgaan knop, wat default `primary` oplevert. Dit zou al correct moeten zijn. Als het visueel rood lijkt, kan dat komen door een CSS conflict.

**Bestand**: `CandidateActions.tsx` -- voeg expliciet `variant="primary"` toe aan de Doorgaan knop voor duidelijkheid.

---

### 5. Board scrollt naar geselecteerde kandidaat

Wanneer een kaart geselecteerd wordt, scroll de board-container zodat de kolom met die kandidaat zichtbaar is.

**Bestand**: `OnboardingPage.tsx` -- voeg een `useEffect` toe die bij wijziging van `selectedCandidateId` de geselecteerde kaart in beeld scrollt via `document.querySelector` en `scrollIntoView({ behavior: 'smooth', inline: 'nearest' })`.

---

### 6. Overflow fix op board container

De board container moet `overflow-hidden` niet gebruiken maar `overflow-x-auto` behouden. Controleer dat de flex parent (`flex flex-1 min-h-0`) correct is zodat het board krimpt in plaats van het panel te overlappen.

**Bestand**: `OnboardingPage.tsx` -- bevestig dat de flex container `overflow-hidden` heeft op het parent level zodat de scroll-context correct is.

---

## Samenvatting bestanden

| Bestand | Wijziging |
|---------|-----------|
| `OnboardingPage.tsx` | Verwijder `title` prop van DetailPanel, scroll-to-selected effect, overflow fix |
| `DetailPanel.tsx` | Close-knop altijd rechts (`ml-auto`) als er geen title is |
| `PhaseTaskList.tsx` | Sorteer previousGroups descending (meest recente fase eerst) |
| `CandidateActions.tsx` | Expliciet `variant="primary"` op Doorgaan knop |

