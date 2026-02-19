

# Floating Reserveerknop: Enterprise Redesign V2

## Probleem

De huidige knop is een afgeronde pill (`border-radius: 16px`) met een platte kleurvulling. Het ziet er functioneel maar generiek uit -- vergelijkbaar met elke standaard booking widget. Voor een enterprise SaaS platform moet deze knop premium aanvoelen, visueel onderscheidend zijn, en vertrouwen wekken bij gasten.

---

## Wat verandert

### 1. Vorm: Van pill naar refined rectangle

De huidige `16px` radius voelt nog steeds als een pill op een compacte knop. De nieuwe vorm:

- **Desktop**: `border-radius: 14px` -- iets scherper, meer "app-achtig"
- **Twee lagen**: De knop krijgt een subtiele **inner border** (`box-shadow: inset 0 0 0 1px rgba(255,255,255,0.15)`) die diepte geeft, zoals frosted glass knoppen in macOS/Linear
- **Grotere padding**: `16px 28px` voor meer ademruimte en premium gevoel

### 2. Achtergrond: Gradient in plaats van flat color

De platte `background: {color}F0` wordt een subtiele **verticale gradient**:

```text
background: linear-gradient(
  180deg,
  {color}  0%,          -- originele kleur bovenaan
  {darken 8%}  100%     -- 8% donkerder onderaan
)
```

Dit geeft de knop een 3D-achtig, "verhoogd" gevoel zonder overdreven te zijn. De darkening wordt berekend in JavaScript (HSL lightness -8%).

### 3. Icoon upgrade: Animated on hover

Het huidige statische kalender-icoon wordt interactief:

- **Rust**: Kalender-icoon op `opacity: 0.85`
- **Hover**: Icoon krijgt `transform: translateX(1px)` en `opacity: 1` -- subtiele "nudge" die uitnodigt

### 4. Tekst verfijning

- **Letter-spacing**: Van `0.02em` naar `0.03em` -- meer luxe uitstraling
- **Font-size**: Van `14px` naar `15px` op desktop voor betere leesbaarheid
- **Text-shadow**: `0 1px 1px rgba(0,0,0,0.08)` voor subtiele diepte op de tekst

### 5. Schaduw systeem: Drie lagen

De huidige twee-laags shadow wordt een drie-laags systeem:

```text
Rust:
  0 1px 2px rgba(0,0,0,0.06),        -- tight contact shadow
  0 4px 12px rgba(0,0,0,0.08),       -- medium elevation
  0 8px 32px {color}30               -- gekleurde ambient glow

Hover:
  0 2px 4px rgba(0,0,0,0.08),        -- tight lifts slightly
  0 8px 20px rgba(0,0,0,0.12),       -- medium deepens
  0 12px 48px {color}40              -- glow intensifies
```

De drie lagen geven een "floating" effect dat veel meer diepte heeft dan de huidige twee lagen.

### 6. Hover: Meer dramatisch

- `translateY(-3px)` in plaats van `-2px` -- meer "lift" gevoel
- `filter: brightness(1.06)` -- subtieler dan de huidige `1.08`
- De schaduw-transitie creëert het gevoel dat de knop echt van het scherm loskomt

### 7. Active/press state (nieuw)

Er is nu geen press feedback. Toevoegen:

- `transform: translateY(0px) scale(0.98)` -- knop drukt in
- `filter: brightness(0.96)` -- iets donkerder
- Schaduw terug naar rust-niveau
- `transition-duration: 0.1s` -- snellere response

### 8. Entrance animatie: Meer dramatisch

De huidige entrance is simpel (fade + slide up 12px). Upgrade:

```text
@keyframes nestoButtonEntrance {
  0%   { opacity: 0; transform: translateY(20px) scale(0.92); }
  60%  { opacity: 1; transform: translateY(-3px) scale(1.01); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
```

Dit geeft een "bounce" effect: de knop schiet iets voorbij zijn eindpositie en settelt dan. Meer playful en opvallend, maar niet overdreven (totaal 400ms).

### 9. Pulse dot: Gepolijst

De huidige pulse dot is een simpele groene cirkel. Upgrade:

- Dubbele ring: `box-shadow: 0 0 0 2px #fff, 0 0 0 4px rgba(16,185,129,0.2)` -- witte ring + subtiele groene glow
- Grotere dot: `10px` in plaats van `8px`
- Positie: `top: -4px; right: -4px`

### 10. Mobiel: Touch-optimized

- Padding: `14px 22px` (groter dan huidige `12px 20px`)
- `border-radius: 14px`
- Active state via `:active` pseudo (via `touchstart`/`touchend` events)
- Bottom offset: `20px` (meer ruimte van edge)

---

## Technische details

### HSL darkening helper

Nieuwe functie in widget.js om de gradient te berekenen:

```javascript
function darkenHex(hex, percent) {
  // Parse hex to RGB, convert to HSL, reduce L by percent, convert back
  // Returns new hex string
}
```

### Event handling voor active state

Omdat inline styles geen `:active` pseudo-class ondersteunen, wordt dit via events gedaan:

```javascript
btn.addEventListener('pointerdown', function() {
  btn.style.transform = 'translateY(0) scale(0.98)';
  btn.style.filter = 'brightness(0.96)';
  // reset shadow to rest level
});
btn.addEventListener('pointerup', function() {
  // restore hover or rest state
});
```

### Backwards compatible

Alle bestaande `data-` attributen blijven werken. De knop is visueel beter maar de API verandert niet.

---

## Bestand

| Bestand | Actie | Samenvatting |
|---------|-------|--------------|
| `public/widget.js` | Wijzigen | Gradient bg, 3-laags shadow, active state, bounce entrance, enhanced pulse dot, icoon hover animatie, text-shadow, grotere padding |

### Geen database of settings wijzigingen nodig

De bestaande configuratie-opties (kleur, label, positie, pulse) blijven ongewijzigd. Dit is puur een visuele upgrade van de knop zelf.

