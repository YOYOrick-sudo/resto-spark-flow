

# Fix: Number input "select-all-and-type" bug

## Probleem

Bij alle number inputs in het systeem: als een veld "1" bevat en je selecteert alles en typt "2", wordt de "1" niet vervangen. Je moet eerst vóór de "1" gaan staan, "2" typen, en dan de "1" verwijderen.

**Oorzaak:** De `onChange` handlers parsen de waarde direct naar een nummer met een fallback:
- `parseInt(e.target.value) || 1` — als je "1" selecteert en "2" typt, is de tussentoestand `""`, die wordt `NaN || 1` → terug naar 1
- `Number(e.target.value)` — `Number("")` = 0, wat bij `min={1}` inputs ongewenst is

De browser vuurt één `onChange` event met `""` als je de selectie vervangt, en het volgende event met de nieuwe waarde. Maar omdat de state al naar de fallback is gezet, wordt het veld opnieuw gerenderd met "1" en de "2" keystroke gaat verloren.

## Oplossing

**Strategie:** Scheid de *display* waarde (string) van de *geparsede* waarde (number). Laat het veld tijdelijk leeg zijn ("") en parse pas naar number bij `onBlur` of submit.

**Twee aanpakken afhankelijk van patroon:**

### Patroon A: State is al een string (bijv. `werkelijkeGram`, `temperatuur`)
Deze werken al goed — `onChange={(e) => setState(e.target.value)}`. Geen fix nodig.

### Patroon B: State is een number met directe parse (de bug)
```typescript
// BUG:
onChange={(e) => setState(parseInt(e.target.value) || 1)}
onChange={(e) => setState(Number(e.target.value))}

// FIX: gebruik string state, parse on blur/submit
const [value, setValue] = useState<string>("1");
onChange={(e) => setValue(e.target.value)}
onBlur={(e) => {
  const parsed = parseInt(e.target.value) || fallback;
  setValue(String(parsed));
  // propagate parsed value
}}
```

**Maar** — dit is een enorme refactor (29+ bestanden, 55+ inputs). Een pragmatischer fix:

### Pragmatische fix: wijzig alleen de fallback-logica

Vervang `parseInt(e.target.value) || 1` door een handler die lege strings toestaat:

```typescript
// In onChange: sta "" toe als tussentoestand
onChange={(e) => {
  const v = e.target.value;
  setState(v === "" ? "" : parseInt(v, 10));
}}
```

Maar dit vereist dat state `number | ""` wordt, wat overal types breekt.

### Beste aanpak: centraal via NestoInput

Voeg een `onChangeNumber` callback toe aan `NestoInput` die de string waarde intern beheert:

```typescript
// NestoInput krijgt een optionele number-mode
interface NestoInputProps {
  // bestaand...
  onNumberChange?: (value: number | null) => void;
  numberFallback?: number; // default bij lege input op blur
}
```

**Maar** dit is te veel refactor. De simpelste fix:

### Definitieve aanpak: patch alle `parseInt(x) || N` naar een helper

**Nieuw:** `src/utils/parseNumberInput.ts`
```typescript
export function parseNumberInput(
  value: string,
  fallback: number
): number | "" {
  if (value === "") return "";
  const n = Number(value);
  return isNaN(n) ? fallback : n;
}
```

En in elk component:
```typescript
// Was:
onChange={(e) => setState(parseInt(e.target.value) || 1)}
// Wordt:
onChange={(e) => {
  const v = e.target.value;
  if (v === "") return; // sta select-all-and-type toe
  setState(parseInt(v, 10) || 1);
}}
```

**Simpelste fix die werkt:** Voeg gewoon `if (v === "") return;` toe. Het veld toont dan even leeg (via de browser native behavior), en zodra de gebruiker het nieuwe cijfer typt, wordt dat opgepikt.

## Gewijzigde bestanden (~16 bestanden)

| Bestand | Aantal inputs |
|---------|--------------|
| `PersoneelsmaaltijdModal.tsx` | 1 |
| `MepCompletionModal.tsx` | 1 |
| `SnellePrepModal.tsx` | 3 |
| `ReceptenDetail.tsx` | 3 |
| `ReceptStapMethodes.tsx` | 3 |
| `ReceptStapIngredienten.tsx` | 1 |
| `MethodesTab.tsx` | 3 |
| `TableModal.tsx` | 3 |
| `LocationSettingsCard.tsx` | 3 |
| `CheckinSettingsCard.tsx` | 2 |
| `OptionSettingsCard.tsx` | 1 |
| `AgentConfigTab.tsx` | 1 |
| `ExtendOptionDialog.tsx` | 1 |
| `ReminderSettingsSection.tsx` | 3 |
| `AutomationFlowsTab.tsx` | 2 |
| `IngredientStapVoorraadPrijs.tsx` | 1 |
| `NieuwIngredientModal.tsx` | 1 |
| `ConditionRow.tsx` | 1 |

## Implementatie per bestand

Elk `parseInt(e.target.value) || N` en `Number(e.target.value)` patroon wordt:

```typescript
onChange={(e) => {
  const v = e.target.value;
  if (v === "") return; // allow select-all-and-retype
  setState(parseInt(v, 10) || fallback);
}}
```

Voor de `Number()` variant (waar 0 een geldige waarde is):
```typescript
onChange={(e) => {
  const v = e.target.value;
  if (v === "") return;
  setState(Number(v));
}}
```

Geen nieuwe bestanden. Geen migraties. Puur onChange handler fixes.

