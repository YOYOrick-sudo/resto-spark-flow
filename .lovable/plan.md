

# Sidebar Navigatie Smooth Maken

## Probleem

Wanneer je van bijv. "Keuken" naar "Reserveringen" navigeert, worden twee dingen tegelijk getriggerd:
1. De Keuken-groep klapt dicht
2. De nieuwe module wordt actief

Dit voelt "houterig" door drie technische oorzaken:
- De animatie is te snel (0.2s) met een abrupte easing curve
- Het in- en uitklappen gebeurt exact tegelijkertijd zonder vertraging
- De opacity springt van 0 naar 1 wat visueel onrustig aanvoelt

## Oplossing

### 1. Animatie timing verbeteren (tailwind.config.ts)

De collapsible animaties aanpassen van 0.2s ease-out naar 0.25s met een premium cubic-bezier curve die consistent is met de rest van het design systeem:

- **collapsible-down**: 0.25s cubic-bezier(0.4, 0, 0.2, 1) — soepel openen
- **collapsible-up**: 0.2s cubic-bezier(0.4, 0, 0.2, 1) — iets sneller sluiten (voelt natuurlijker)
- Opacity-animatie verwijderen uit de keyframes (veroorzaakt flicker)

### 2. Collapse-gedrag versoepelen (NestoSidebar.tsx)

Het huidige gedrag forceert dat slechts een groep tegelijk open kan zijn. Dit aanpassen:

- Bij navigatie naar een andere module: laat de oude groep nog even open staan (kort delay van ~150ms) voordat deze dichtklapt
- Dit creëert een subtiel "stagger" effect waarbij de nieuwe groep al begint te openen terwijl de oude nog net zichtbaar is
- Implementatie via een `setTimeout` in de `useEffect` die de expandedGroups update, met een cleanup om race conditions te voorkomen

### 3. Content overflow verbetering

De `overflow-hidden` op `Collapsible.Content` zorgt voor harde clip-randen. Dit verfijnen door `will-change: height` toe te voegen voor GPU-acceleratie en een soepelere render.

## Technische details

### Bestanden die wijzigen:

**tailwind.config.ts** — Aangepaste animatie keyframes en timing:
- Keyframes: opacity-animatie verwijderen, alleen height animeren
- Timing: cubic-bezier(0.4, 0, 0.2, 1) i.p.v. ease-out
- Duur: 0.25s open / 0.2s dicht

**src/components/layout/NestoSidebar.tsx** — Stagger-effect bij groepswisseling:
- De `useEffect` op `location.pathname` krijgt een 150ms delay voor het sluiten van de oude groep
- Eerst de nieuwe groep toevoegen aan `expandedGroups`, dan na delay de oude verwijderen
- Cleanup functie om memory leaks en race conditions te voorkomen bij snel navigeren

## Wat niet verandert
- Geen database wijzigingen
- Geen nieuwe componenten
- Geen wijzigingen aan routing of navigatie-structuur
- Het visuele ontwerp (kleuren, spacing, icons) blijft identiek

