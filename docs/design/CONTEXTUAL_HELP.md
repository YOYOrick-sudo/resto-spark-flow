# Contextual Help Pattern

## Overview

The Contextual Help pattern provides inline, non-intrusive help for complex settings without cluttering the UI. It uses a small info icon that reveals a popover with explanatory content.

There are **two variants**:

| Variant | Use Case | Has Header |
|---------|----------|------------|
| `TitleHelp` | Page/section titles | ✅ Yes |
| `FieldHelp` | Form field labels | ❌ No |

---

## TitleHelp (for Page Titles)

Used next to page or section titles. Features a header with title.

```tsx
import { TitleHelp, TitleHelpTip } from "@/components/polar";

<span className="flex items-center gap-2">
  Pacing Limits
  <TitleHelp title="Wat is pacing?">
    <p className="text-muted-foreground">
      Beperkt hoeveel gasten per kwartier kunnen reserveren.
    </p>
    <TitleHelpTip>
      Richtlijn: casual dining 0.5-1.0 turns/uur.
    </TitleHelpTip>
  </TitleHelp>
</span>
```

### TitleHelpTip

Optional callout for actionable benchmarks or tips within the popover.

```tsx
<TitleHelpTip>
  Benchmark: casual dining 0.5-1.0 turns/uur, fine dining 0.3 of lager.
</TitleHelpTip>
```

---

## FieldHelp (for Form Fields)

Used next to form field labels. No header, more compact. Opens upward to avoid covering inputs.

```tsx
import { FieldHelp, FieldHelpExample } from "@/components/polar";

<div className="flex items-center gap-1.5">
  <Label htmlFor="extra_seats">Extra stoelen</Label>
  <FieldHelp>
    <p className="text-muted-foreground">
      Corrigeer het aantal stoelen voor deze combinatie.
      Negatief als er stoelen wegvallen door de opstelling.
    </p>
    <FieldHelpExample>
      <p>2 + 2 met stoelen erbij: +2</p>
      <p>4 + 4 met verlies kopse kanten: -2</p>
    </FieldHelpExample>
  </FieldHelp>
</div>
```

### FieldHelpExample

Optional styled example block with italic text and top border.

---

## Visual Specifications

### Shared Styling

| Element | Value |
|---------|-------|
| Icon | `Info` (lucide-react), 16px (`h-4 w-4`) |
| Icon color | `text-muted-foreground` → `text-primary` on hover |
| Popover width | 320px (`w-80`) |
| Popover radius | `rounded-dropdown` (12px) |
| Popover shadow | `shadow-md` |
| Border | `border border-border` |
| Body padding | `px-4 py-3` |

### TitleHelp Specific

| Element | Value |
|---------|-------|
| Header bg | `bg-muted/30` |
| Header padding | `px-4 py-2.5` |
| Tip bg | `bg-muted/50` |
| Tip icon | `Lightbulb`, `text-warning` |
| Position | `side="bottom" align="start"` |

### FieldHelp Specific

| Element | Value |
|---------|-------|
| Header | None |
| Example border | `border-t border-border` |
| Example text | `text-xs italic` |
| Position | `side="top" align="start"` |

---

## Positioning

### TitleHelp
```tsx
<PopoverContent side="bottom" align="start">
```
Opens **below** the trigger to avoid overlapping page headers.

### FieldHelp
```tsx
<PopoverContent side="top" align="start">
```
Opens **above** the trigger to avoid covering form inputs.

---

## Content Guidelines

### Structure

1. **Opening paragraph**: What does this setting control? (1-2 sentences, ≤30 words)
2. **TitleHelpTip / FieldHelpExample**: Practical benchmarks or examples

### Enterprise Quality Checklist

| Aspect | ❌ Avoid | ✅ Use |
|--------|---------|--------|
| Language | Abstract numbers | Industry terms |
| Benchmarks | One-size-fits-all | Segment-specific |
| Examples | Arbitrary | Practical, relatable |

---

## When to Use

✅ **Use for:**
- Settings that affect operations (pacing, capacity, timing)
- Terms with industry-specific meaning
- Settings where wrong values cause visible problems
- Complex calculations that need explanation

❌ **Don't use for:**
- Self-explanatory fields (name, email)
- Settings with inline validation
- Every single input (clutters UI)

---

## File Locations

| Component | File |
|-----------|------|
| TitleHelp, TitleHelpTip | `src/components/polar/TitleHelp.tsx` |
| FieldHelp, FieldHelpExample | `src/components/polar/FieldHelp.tsx` |

Both exported via `src/components/polar/index.ts`.
