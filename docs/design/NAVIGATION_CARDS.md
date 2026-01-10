# Navigation Cards Styling Pattern

## Overzicht

Navigation Cards zijn clickable cards die gebruikers naar een andere pagina navigeren. Ze worden gebruikt voor:
- Settings module/sectie navigatie
- Dashboard shortcuts
- Module overzichten
- Elke situatie waar je een lijst van navigeerbare items toont

Dit patroon volgt een **Enterprise Compact** design (Stripe, Linear, Salesforce density).

---

## Card Base Styling

```tsx
<Link
  to={path}
  className={cn(
    // Layout - compact enterprise density
    "group flex items-center gap-4 py-3 px-4",
    // Border & Shape
    "rounded-card border border-border",
    // Background - no base shadow
    "bg-card",
    // Hover States - subtle elevation
    "hover:bg-accent/50 hover:shadow-sm",
    // Transition
    "transition-all duration-200",
    // Cursor
    "cursor-pointer"
  )}
>
```

| Property | Waarde | Toelichting |
|----------|--------|-------------|
| Padding | `py-3 px-4` (12px / 16px) | Compact maar klikbaar |
| Gap | `gap-4` (16px) | Ruimte tussen elementen |
| Alignment | `items-center` | Verticaal gecentreerd |
| Border | `border border-border` (1px) | Subtiele border |
| Border radius | `rounded-card` (16px) | Card radius token |
| Shadow | Geen base → `hover:shadow-sm` | Minimal elevation |
| Background hover | `hover:bg-accent/50` | Subtle highlight |
| Transition | `transition-all duration-200` | Smooth 200ms |

---

## Icon Container

```tsx
<div className="flex-shrink-0 w-8 h-8 rounded-md bg-primary/5 flex items-center justify-center">
  <Icon className="h-4 w-4 text-primary" />
</div>
```

| Property | Waarde | Toelichting |
|----------|--------|-------------|
| Container size | `w-8 h-8` (32px) | Compact proportie |
| Border radius | `rounded-md` (6px) | Subtiel afgerond |
| Background | `bg-primary/5` | Zeer subtiel teal |
| Icon size | `h-4 w-4` (16px) | Proportioneel aan container |
| Icon color | `text-primary` | Teal kleur |

---

## Text Styling

```tsx
<div className="flex-1 min-w-0">
  <div className="flex items-center gap-2">
    <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
      {title}
    </h3>
    {count !== undefined && (
      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-control">
        {count}
      </span>
    )}
  </div>
  {description && (
    <p className="text-xs text-muted-foreground mt-0.5">
      {description}
    </p>
  )}
</div>
```

| Element | Classes | Toelichting |
|---------|---------|-------------|
| Title | `text-sm font-medium text-foreground` | 14px semi-bold |
| Title hover | `group-hover:text-primary transition-colors` | Teal on hover |
| Description | `text-xs text-muted-foreground mt-0.5` | 12px subtiele tekst |

---

## Count Badge (Optioneel)

```tsx
{count !== undefined && (
  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-control">
    {count}
  </span>
)}
```

| Property | Waarde | Toelichting |
|----------|--------|-------------|
| Font size | `text-xs` (12px) | Klein maar leesbaar |
| Color | `text-muted-foreground` | Gray metadata style |
| Background | `bg-muted` | Neutrale achtergrond |
| Padding | `px-1.5 py-0.5` | Zeer compact |
| Border radius | `rounded-control` (6px) | Control radius token |

**Let op:** Gebruik `bg-muted` met `text-muted-foreground` voor metadata badges (count).

---

## Chevron Indicator

```tsx
<ChevronRight className={cn(
  "h-4 w-4 text-muted-foreground flex-shrink-0",
  // Hover animation
  "group-hover:translate-x-0.5 group-hover:text-primary",
  // Transition
  "transition-all duration-200"
)} />
```

| Property | Waarde | Toelichting |
|----------|--------|-------------|
| Size | `h-4 w-4` (16px) | Compact grootte |
| Default color | `text-muted-foreground` | Subtiel grijs |
| Hover color | `group-hover:text-primary` | Teal on hover |
| Hover animation | `group-hover:translate-x-0.5` | Subtle slide right (2px) |
| Transition | `transition-all duration-200` | Smooth 200ms |

---

## Layout Varianten per Niveau

### Level 2: Grid Layout (Module Overview)

Gebruik voor module index pagina's met meerdere secties:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {sections.map(section => (
    <NavigationCard key={section.id} {...section} />
  ))}
</div>
```

| Property | Waarde | Toelichting |
|----------|--------|-------------|
| Layout | `grid grid-cols-1 md:grid-cols-2` | 2 kolommen op desktop |
| Gap | `gap-4` (16px) | Ruimte tussen cards |
| Max width | Geen (volgt container) | Vult SettingsContainer |

### Level 3: Stacked Layout (Section Overview)

Gebruik voor sectie pagina's met subsecties:

```tsx
<div className="space-y-3 max-w-2xl">
  {subsections.map(subsection => (
    <NavigationCard key={subsection.id} {...subsection} />
  ))}
</div>
```

| Property | Waarde | Toelichting |
|----------|--------|-------------|
| Layout | `space-y-3` | Verticaal gestapeld |
| Spacing | 12px tussen cards | Compact spacing |
| Max width | `max-w-2xl` (672px) | Beperkte breedte |

### Visuele Vergelijking

| Niveau | Layout | Card Breedte | Use Case |
|--------|--------|--------------|----------|
| Level 2 | Grid (2 col) | ~50% van 1024px = ~500px | Module secties |
| Level 3 | Stacked | max 672px | Subsecties binnen sectie |

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
        // Compact enterprise layout
        "group flex items-center gap-4 py-3 px-4",
        // Border & shape
        "rounded-card border border-border",
        // Background & hover
        "bg-card hover:bg-accent/50 hover:shadow-sm",
        // Transition
        "transition-all duration-200 cursor-pointer"
      )}
    >
      {/* Icon - 32px container */}
      {Icon && (
        <div className="flex-shrink-0 w-8 h-8 rounded-md bg-primary/5 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
            {title}
          </h3>
          {count !== undefined && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-control">
              {count}
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {description}
          </p>
        )}
      </div>

      {/* Chevron - 16px */}
      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 group-hover:translate-x-0.5 group-hover:text-primary transition-all duration-200" />
    </Link>
  );
}
```

---

## Implementatie in Settings Layouts

### SettingsModuleLayout (Level 2)

```tsx
// src/components/settings/layouts/SettingsModuleLayout.tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {config.sections.map((section) => (
    <Link key={section.id} to={section.path} className="...">
      {/* Card content */}
    </Link>
  ))}
</div>
```

### SettingsSectionLayout (Level 3)

```tsx
// src/components/settings/layouts/SettingsSectionLayout.tsx
<div className="space-y-3 max-w-2xl">
  {section.subsections.map((subsection) => (
    <Link key={subsection.id} to={subsection.path} className="...">
      {/* Card content */}
    </Link>
  ))}
</div>
```

---

## Checklist

Bij het maken van nieuwe navigation cards, controleer:

- [ ] Card heeft `py-3 px-4` padding (compact)
- [ ] Card heeft `items-center` alignment
- [ ] Card heeft `border border-border` (1px, geen 1.5px)
- [ ] Card heeft geen base shadow, alleen `hover:shadow-sm`
- [ ] Card heeft `hover:bg-accent/50` background
- [ ] Icon container is `w-8 h-8` (32px) met `bg-primary/5`
- [ ] Icon is `h-4 w-4` (16px)
- [ ] Title is `text-sm font-medium` (14px)
- [ ] Description is `text-xs` (12px)
- [ ] Count badge gebruikt `bg-muted text-muted-foreground`
- [ ] Chevron is `h-4 w-4` (16px)
- [ ] Chevron heeft slide animation `group-hover:translate-x-0.5`
- [ ] Level 2 gebruikt `grid grid-cols-1 md:grid-cols-2 gap-4`
- [ ] Level 3 gebruikt `space-y-3 max-w-2xl`

---

## Gerelateerde Documentatie

- [BORDER_RADIUS.md](./BORDER_RADIUS.md) - Border radius tokens
- [COLOR_PALETTE.md](./COLOR_PALETTE.md) - Kleur definities
- [SETTINGS_MULTI_LEVEL_NAVIGATION.md](./SETTINGS_MULTI_LEVEL_NAVIGATION.md) - Settings navigatie structuur
- [SETTINGS_PAGE_PATTERNS.md](./SETTINGS_PAGE_PATTERNS.md) - Settings page patterns
