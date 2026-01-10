# Contextual Help Pattern

## Overview

The Contextual Help pattern provides inline, non-intrusive help for complex settings without cluttering the UI. It uses a small info icon next to titles that reveals a popover with explanatory content.

## Components

### TitleHelp

The main wrapper component that renders an info icon and popover.

```tsx
import { TitleHelp, TitleHelpTip } from "@/components/polar";

<TitleHelp title="Wat is pacing?">
  <p className="text-muted-foreground">
    Beperkt hoeveel gasten per kwartier kunnen reserveren.
  </p>
  <TitleHelpTip>
    Richtlijn: casual dining 0.5-1.0 turns/uur.
  </TitleHelpTip>
</TitleHelp>
```

### TitleHelpTip

Optional callout for actionable benchmarks or tips within the popover.

```tsx
<TitleHelpTip>
  Benchmark: casual dining 0.5-1.0 turns/uur, fine dining 0.3 of lager.
</TitleHelpTip>
```

## Visual Specifications

| Element | Value |
|---------|-------|
| Icon | `Info` (lucide-react), 16px (`h-4 w-4`) |
| Icon color | `text-muted-foreground` → `text-primary` on hover |
| Popover width | 320px (`w-80`) |
| Popover radius | `rounded-dropdown` (12px) |
| Popover shadow | `shadow-md` |
| Header bg | `bg-muted/30` |
| Header padding | `px-4 py-2.5` |
| Body padding | `px-4 py-3` |
| Tip bg | `bg-muted/50` |
| Tip icon | `Lightbulb`, `text-warning` |

## Positioning

```tsx
<PopoverContent
  side="bottom"
  align="start"
  // ...
>
```

- **side="bottom"**: Opens below the trigger
- **align="start"**: Aligns to the left edge

This ensures visibility on tablets (iPad) and avoids overlapping page content.

## Usage Pattern

Place `TitleHelp` inline with section titles:

```tsx
<span className="flex items-center gap-2">
  Section Title
  <TitleHelp title="Section Title">
    <p className="text-muted-foreground">
      Explanation of what this section controls.
    </p>
    <ul className="list-disc list-inside text-muted-foreground space-y-1">
      <li>Consequence of setting too high</li>
      <li>Consequence of setting too low</li>
    </ul>
    <TitleHelpTip>
      Actionable benchmark or industry standard.
    </TitleHelpTip>
  </TitleHelp>
</span>
```

## Content Guidelines

### Enterprise Quality Checklist

| Aspect | ❌ Avoid | ✅ Use |
|--------|---------|--------|
| Language | Abstract numbers ("8-10") | Industry terms ("turns/uur") |
| Benchmarks | One-size-fits-all | Segment-specific (casual vs fine dining) |
| Action | Vague ("evaluate later") | Direct ("check panel rechts") |
| Examples | Arbitrary ("12 gasten = 48/uur") | Omit if not adding value |

### Structure

1. **Opening paragraph**: What does this setting control? (1-2 sentences)
2. **Consequences list**: What happens if too high/low? (max 3 items)
3. **TitleHelpTip**: Actionable benchmark with industry context

### Word Limits

- Opening paragraph: ≤30 words
- List items: ≤10 words each
- Tip: ≤25 words

## When to Use

✅ **Use for:**
- Settings that affect operations (pacing, capacity, timing)
- Terms that have industry-specific meaning
- Settings where wrong values cause visible problems

❌ **Don't use for:**
- Self-explanatory fields (name, email)
- Settings with inline validation
- Every single input (clutters UI)

## File Location

```
src/components/polar/TitleHelp.tsx
```

Exported via `src/components/polar/index.ts`.
