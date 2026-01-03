# 🎨 NESTO BORDER RADIUS HIËRARCHIE

---

## **TAILWIND TOKENS**

| Token | Waarde | CSS Class | Gebruik |
|-------|--------|-----------|---------|
| `control` | `6px` | `rounded-control` | Badges, tags, mini controls |
| `button` | `8px` | `rounded-button` | Outline/secondary/danger buttons, inputs |
| `button-primary` | `16px` | `rounded-button-primary` | Primary buttons (filled teal CTAs) |
| `dropdown` | `12px` | `rounded-dropdown` | Menus, popovers, dropdown lists |
| `card` | `16px` | `rounded-card` | Cards, modals, panels (DEFAULT) |
| `card-sm` | `12px` | `rounded-card-sm` | Kleine info boxes (override) |

---

## **GEDETAILLEERDE BREAKDOWN:**

### **📦 CARDS & CONTAINERS**

```tsx
// NestoCard - DEFAULT (grote containers: KPI, task lists, empty states)
<NestoCard>  // borderRadius = 16px default!
  {children}
</NestoCard>

// NestoCard - KLEINE INFO BOXES (override naar 12px)
<NestoCard radius="small">
  {children}
</NestoCard>
```

**REGEL:** 
- **NestoCard default = 16px** (grote cards/containers)
- **Override naar 12px** via `radius="small"` prop

---

### **🔘 BUTTONS**

```tsx
// Primary buttons (filled teal: Save, Submit, New Reservation)
<NestoButton variant="primary">  // rounded-button-primary (16px)

// Outline/Secondary/Danger buttons
<NestoButton variant="outline">  // rounded-button (8px)
<NestoButton variant="secondary">  // rounded-button (8px)
<NestoButton variant="danger">  // rounded-button (8px)

// Mini control buttons (+ - stepper)
// Use rounded-control (6px) class directly
```

**REGEL:** 
- Primary (filled teal) buttons = 16px
- Outline/secondary/danger = 8px
- Mini controls = 6px

---

### **📝 INPUTS**

```tsx
// Text input, textarea, select
<Input />  // rounded-button (8px)
<NestoSelect />  // Trigger: 8px, Dropdown: 12px

// SearchBar
<SearchBar />  // rounded-button (8px)
```

**REGEL:** Inputs = 8px, dropdowns = 12px

---

### **🏷️ BADGES & TAGS**

```tsx
<NestoBadge>Status</NestoBadge>  // rounded-control (6px)
```

**REGEL:** Badges = 6px

---

### **📋 DROPDOWNS & MENUS**

```tsx
// Dropdown menu container
<SelectContent />  // rounded-dropdown (12px)

// Menu items (hover state)
// Items inside use 8px radius
```

**REGEL:** Menu container = 12px

---

### **🪟 MODALS & SIDEBARS**

```tsx
<NestoModal>  // rounded-card (16px)
  {children}
</NestoModal>
```

**REGEL:** Grote overlays = 16px

---

## **SAMENVATTING:**

```
6px  → Badges, tags, mini controls (rounded-control)
8px  → Outline/secondary/danger buttons, inputs (rounded-button)
12px → Kleine info boxes, dropdowns, popovers (rounded-dropdown, rounded-card-sm)
16px → NestoCard DEFAULT, PRIMARY buttons, modals (rounded-card, rounded-button-primary)
```

---

## **COMPONENT DEFAULTS:**

| Component | Default Radius | Override |
|-----------|----------------|----------|
| NestoCard | 16px | `radius="small"` → 12px |
| NestoButton (primary) | 16px | - |
| NestoButton (other) | 8px | - |
| NestoModal | 16px | - |
| NestoBadge | 6px | - |
| NestoSelect trigger | 8px | - |
| NestoSelect dropdown | 12px | - |
| SearchBar | 8px | - |
| Input | 8px | - |

---

## **NIET GEBRUIKEN:**

```
❌ 4px
❌ 10px
❌ 14px

✅ ALLEEN: 6, 8, 12, 16
```
