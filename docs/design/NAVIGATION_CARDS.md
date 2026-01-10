# Navigation Cards Styling Pattern

## Overzicht

Navigation Cards zijn clickable cards die gebruikers naar een andere pagina navigeren. Ze worden gebruikt voor:
- Settings module/sectie navigatie
- Dashboard shortcuts
- Module overzichten
- Elke situatie waar je een lijst van navigeerbare items toont

Dit patroon volgt enterprise design referenties (Stripe, Linear, Salesforce).

---

## Card Base Styling

```tsx
<Link
  to={path}
  className={cn(
    // Layout
    "group flex items-start gap-4 p-5",
    // Border & Shape
    "rounded-card border-[1.5px] border-border",
    // Background & Shadow
    "bg-card shadow-sm",
    // Hover States
    "hover:shadow-md hover:border-primary/30",
    // Transition
    "transition-all duration-200",
    // Cursor
    "cursor-pointer"
  )}
>
```

| Property | Waarde | Toelichting |
|----------|--------|-------------|
| Padding | `p-5` (20px) | Ruime klikbare area |
| Gap | `gap-4` (16px) | Ruimte tussen elementen |
| Border | `border-[1.5px] border-border` | Subtiele border |
| Border radius | `rounded-card` (16px) | Card radius token |
| Shadow | `shadow-sm` → `hover:shadow-md` | Elevation on hover |
| Border hover | `hover:border-primary/30` | Teal accent on hover |
| Transition | `transition-all duration-200` | Smooth 200ms |

---

## Icon Container

```tsx
<div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
  <Icon className="h-5 w-5 text-primary" />
</div>
```

| Property | Waarde | Toelichting |
|----------|--------|-------------|
| Container size | `w-10 h-10` (40px) | Consistente grootte |
| Border radius | `rounded-lg` (8px) | Zacht maar niet rond |
| Background | `bg-primary/10` | Subtiel teal accent |
| Icon size | `h-5 w-5` (20px) | Proportioneel aan container |
| Icon color | `text-primary` | Teal kleur |

---

## Text Styling

```tsx
<div className="flex-1 min-w-0">
  <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
    {title}
  </h3>
  <p className="text-sm text-muted-foreground mt-0.5">
    {description}
  </p>
</div>
```

| Element | Classes | Toelichting |
|---------|---------|-------------|
| Title | `font-medium text-foreground` | Semi-bold, primaire kleur |
| Title hover | `group-hover:text-primary transition-colors` | Teal on hover |
| Description | `text-sm text-muted-foreground mt-0.5` | Kleinere subtiele tekst |

---

## Count Badge (Optioneel)

```tsx
{count !== undefined && (
  <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-control font-medium">
    {count}
  </span>
)}
```

| Property | Waarde | Toelichting |
|----------|--------|-------------|
| Font size | `text-xs` | Klein maar leesbaar |
| Color | `text-primary` | Teal tekst |
| Background | `bg-primary/10` | Matcht icon container |
| Padding | `px-2 py-0.5` | Compact |
| Border radius | `rounded-control` (6px) | Control radius token |
| Font weight | `font-medium` | Semi-bold |

**Let op:** Gebruik NIET `bg-muted` voor count badges in navigation cards.

---

## Chevron Indicator

```tsx
<ChevronRight className={cn(
  "h-5 w-5 text-muted-foreground flex-shrink-0 self-center",
  // Hover animation
  "group-hover:translate-x-0.5 group-hover:text-primary",
  // Transition
  "transition-all duration-200"
)} />
```

| Property | Waarde | Toelichting |
|----------|--------|-------------|
| Size | `h-5 w-5` (20px) | Consistente grootte |
| Default color | `text-muted-foreground` | Subtiel grijs |
| Hover color | `group-hover:text-primary` | Teal on hover |
| Hover animation | `group-hover:translate-x-0.5` | Subtle slide right (2px) |
| Transition | `transition-all duration-200` | Smooth 200ms |

---

## Layout Varianten

### Grid Layout (Module Overview)
Gebruik voor niveau 2 pagina's met meerdere secties:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
  {items.map(item => (
    <NavigationCard key={item.id} {...item} />
  ))}
</div>
```

### Stacked Layout (Section Overview)
Gebruik voor niveau 3 pagina's met subsecties:

```tsx
<div className="space-y-4 max-w-2xl">
  {items.map(item => (
    <NavigationCard key={item.id} {...item} />
  ))}
</div>
```

---

## Volledige Component Voorbeeld

```tsx
import { Link } from "react-router-dom";
import { ChevronRight, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavigationCardProps {
  to: string;
  icon?: LucideIcon;
  title: string;
  description?: string;
  count?: number;
}

export function NavigationCard({ 
  to, 
  icon: Icon, 
  title, 
  description, 
  count 
}: NavigationCardProps) {
  return (
    <Link
      to={to}
      className={cn(
        "group flex items-start gap-4 p-5 rounded-card border-[1.5px] border-border",
        "bg-card shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 cursor-pointer"
      )}
    >
      {/* Icon */}
      {Icon && (
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
            {title}
          </h3>
          {count !== undefined && (
            <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-control font-medium">
              {count}
            </span>
          )}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">
            {description}
          </p>
        )}
      </div>

      {/* Chevron */}
      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 self-center group-hover:translate-x-0.5 group-hover:text-primary transition-all duration-200" />
    </Link>
  );
}
```

---

## Checklist

Bij het maken van nieuwe navigation cards, controleer:

- [ ] Card heeft `p-5` padding
- [ ] Card heeft `shadow-sm` base en `hover:shadow-md`
- [ ] Card heeft `hover:border-primary/30` border accent
- [ ] Icon container is `w-10 h-10` met `bg-primary/10`
- [ ] Title heeft `group-hover:text-primary transition-colors`
- [ ] Count badges gebruiken `bg-primary/10` (niet `bg-muted`)
- [ ] Chevron heeft slide animation `group-hover:translate-x-0.5`
- [ ] Chevron heeft `group-hover:text-primary`
- [ ] Alle transitions zijn `duration-200`
- [ ] Card gebruikt `group` class voor hover coordination

---

## Gerelateerde Documentatie

- [BORDER_RADIUS.md](./BORDER_RADIUS.md) - Border radius tokens
- [COLOR_PALETTE.md](./COLOR_PALETTE.md) - Kleur definities
- [SETTINGS_MULTI_LEVEL_NAVIGATION.md](./SETTINGS_MULTI_LEVEL_NAVIGATION.md) - Settings navigatie structuur
