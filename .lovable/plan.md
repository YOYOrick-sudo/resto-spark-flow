

## Fix: Sticky tijdlijn header en pacing rij bij scrollen

### Probleem

De `TimelineHeader` en `SeatedCountRow` hebben al `sticky top-0` en `sticky top-[40px]`, maar sticky werkt niet omdat het verkeerde element scrollt.

De huidige structuur:

```text
div.flex-1.overflow-auto  <-- DIT scrollt (pagina-niveau)
  div.overflow-hidden     <-- card wrapper, geen vaste hoogte
    ReservationGridView
      div.overflow-hidden
        div.overflow-auto  <-- DIT zou moeten scrollen, maar doet het niet
          TimelineHeader (sticky top-0)
          SeatedCountRow (sticky top-[40px])
          ...rows
```

Omdat de buitenste `overflow-auto` scrollt en niet de binnenste, hebben de sticky elementen geen werkende scroll-context.

### Oplossing

De grid view moet de volledige beschikbare hoogte innemen zodat de **interne** scroll container daadwerkelijk scrollt.

---

### Wijzigingen

#### `src/pages/Reserveringen.tsx` (regel 140-141)

De content area wrapper en de card wrapper moeten de hoogte doorgeven aan de grid:

- Regel 140: wijzig `overflow-auto p-4 pt-2` naar `overflow-hidden p-4 pt-2` (voorkom dubbel scrollen)
- Regel 141: voeg `h-full` toe aan de card wrapper, zodat de hoogte doorstroomt

Maar alleen voor de grid view -- de list view en calendar view moeten nog normaal scrollen. Daarom:

- Conditioneel: als `activeView === "grid"`, gebruik `overflow-hidden` op de content area. Anders `overflow-auto`.
- De card wrapper krijgt conditioneel `h-full` als grid actief is.

Concreet:

```
Regel 140: className={cn("flex-1 p-4 pt-2", activeView === "grid" ? "overflow-hidden" : "overflow-auto")}
Regel 141: className={cn("bg-card border border-border rounded-2xl overflow-hidden", activeView === "grid" && "h-full")}
```

#### `src/components/reserveringen/ReservationGridView.tsx` (geen wijziging nodig)

De grid view heeft al `h-full overflow-hidden` op de outer div en `h-full overflow-auto` op de scroll container. Zodra de parent een vaste hoogte doorgeeft, werkt sticky automatisch.

---

### Resultaat

Na de fix:

```text
div.flex-1.overflow-hidden  <-- scrollt NIET meer (grid modus)
  div.overflow-hidden.h-full
    ReservationGridView
      div.overflow-hidden.h-full
        div.overflow-auto.h-full  <-- DIT scrollt nu WEL
          TimelineHeader (sticky top-0) -- WERKT
          SeatedCountRow (sticky top-[40px]) -- WERKT
          ...rows
```

### Bestanden

| Bestand | Actie |
|---|---|
| `src/pages/Reserveringen.tsx` | Conditioneel overflow/height op content wrappers |

