# 🎨 NESTO BUTTON STYLING GUIDE

---

## **BUTTON AFRONDING (BORDER RADIUS)**

| Type | Border Radius | Gebruik | Voorbeeld |
|------|---------------|---------|-----------|
| **Standaard** | `8px` | Outline, secondary, danger | Opslaan, Annuleren, Verwijderen |
| **Hero CTA** | `16px` | Primary buttons met actie-nadruk | "+ New Reservation" |
| **Mini controls** | `6px` | Kleine +/- buttons, stepper | Aantal aanpassen |

**✅ REGEL:**
- **Primary buttons = 16px** (zoals "+ New Reservation", grote Save buttons)
- Outline/secondary/danger = 8px
- Mini controls = 6px

**NB:** Cards gebruiken 16px! Zie `/docs/design/BORDER_RADIUS.md` voor volledig overzicht.

---

## **BUTTON TYPES**

### **1. PRIMARY BUTTON (Filled)**
```tsx
{
  padding: '10px 20px',
  backgroundColor: '#1d979e',  // Nesto teal (HSL: 183 70% 37%)
  color: '#FFFFFF',
  border: 'none',
  borderRadius: '16px',  // ⬅️ PRIMARY = 16px!
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
}

// Hover state
backgroundColor: '#2BB4BC'  // Lighter teal (HSL: 183 63% 45%)
```

**Gebruik:** Hoofdacties (Save, Submit, Create, "+ New Reservation")
**Radius:** 16px voor visuele nadruk

---

### **2. OUTLINE BUTTON (Transparent/Subtle)**
```tsx
{
  padding: '8px 12px',
  backgroundColor: 'transparent',  // Of '#F4F5F6' (subtle grey)
  border: '1.5px solid transparent',
  borderRadius: '8px',  // ⬅️ OUTLINE = 8px
  fontSize: '13px',
  fontWeight: 500,
  color: '#36373A',  // Secondary text
  cursor: 'pointer',
}

// Selected state
{
  backgroundColor: 'rgba(29, 151, 158, 0.1)',  // Light teal bg
  border: '1.5px solid #1d979e',
  color: '#1d979e',
}
```

**Gebruik:** Filter buttons, toggle groups (Lunch/Diner, Actief/Inactief)

---

### **3. SECONDARY BUTTON (Grey)**
```tsx
{
  padding: '10px 20px',
  backgroundColor: '#F4F5F6',  // Subtle grey
  color: '#17171C',
  border: 'none',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
}

// Hover state
backgroundColor: '#ECEDED'  // Darker grey
```

**Gebruik:** Cancel, Back, Secondary acties

---

### **4. DANGER BUTTON (Red)**
```tsx
{
  padding: '10px 20px',
  backgroundColor: '#EF4444',  // Red
  color: '#FFFFFF',
  border: 'none',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
}

// Hover state
backgroundColor: '#DC2626'  // Darker red
```

**Gebruik:** Delete, Remove, Verwijderen

---

### **5. GHOST BUTTON (Transparent)**
```tsx
{
  padding: '6px 12px',
  backgroundColor: 'transparent',
  border: 'none',
  borderRadius: '8px',
  fontSize: '14px',
  color: '#36373A',
  cursor: 'pointer',
}

// Hover state
backgroundColor: '#F4F5F6'
```

**Gebruik:** Close, Cancel icons, subtle acties

---

## **BUTTON SIZES**

| Size | Padding | Font Size | Gebruik |
|------|---------|-----------|---------|
| **SM** | `6px 10px` | `12px` | Compact spaces, tags |
| **MD** | `8px 12px` | `13px` | Filter buttons, outline groups |
| **LG** | `10px 20px` | `14px` | Primary/secondary buttons |
| **XL** | `14px 20px` | `15px` | Hero CTAs, modals |

---

## **DARK MODE**

```css
/* Primary button - BLIJFT HETZELFDE */
background: #1d979e
color: #FFFFFF

/* Secondary button */
background: #2F3037  (ipv #F4F5F6)
color: #FFFFFF

/* Outline button selected */
background: rgba(29, 151, 158, 0.2)  (iets sterker)
border: 1.5px solid #1d979e
color: #1d979e
```

---

## **TAILWIND CLASSES**

### **Primary Button**
```tsx
<NestoButton variant="primary">Opslaan</NestoButton>
// Uses: rounded-button-primary (16px), bg-primary, hover:bg-primary-hover
```

### **Outline Button Group**
```tsx
import { NestoOutlineButtonGroup } from './components/polar/NestoOutlineButtonGroup';

<NestoOutlineButtonGroup
  options={[
    { value: 'actief', label: 'Actief' },
    { value: 'inactief', label: 'Inactief' },
  ]}
  value={status}
  onChange={setStatus}
  size="md"
/>
```

---

## **SAMENVATTING**

```
BUTTON AFRONDING:
- PRIMARY (filled teal): 16px  ⬅️ BELANGRIJK!
- Outline/Secondary/Danger: 8px
- Mini controls: 6px

KLEUREN:
- Primary: #1d979e (HSL: 183 70% 37%)
- Primary hover: #2BB4BC (HSL: 183 63% 45%)

TAILWIND TOKENS:
- rounded-button-primary: 16px
- rounded-button: 8px
- rounded-control: 6px

COMPONENT:
Gebruik NestoOutlineButtonGroup voor filter buttons
(Lunch/Diner, Actief/Inactief, categorie filters, etc.)
```
