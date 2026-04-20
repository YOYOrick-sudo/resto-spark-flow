
User approved Option A. Switching to default mode to implement.

## Build steps

**1. `tailwind.config.ts`**
Add to `screens`:
```ts
screens: { 'touch': { raw: '(pointer: coarse)' } }
```

**2. `src/components/layout/NestoSidebar.tsx`**
- Collapsed item-buttons: add `touch:min-h-11 touch:min-w-11`
- Icons inside collapsed items: `touch:size-6` (24px from 20px)
- Header collapse-toggle + footer toggle: `touch:min-h-11 touch:min-w-11`
- Verify active-state background (`bg-accent` / `bg-primary/10`) extends to full button container — already uses `w-full` so highlight scales naturally with `min-h-11`. No extra change needed.

**3. `src/components/polar/NestoButton.tsx`**
In `cva` size variants:
- `default`: `h-10 ... touch:h-11`
- `sm`: `h-8 ... touch:h-11 touch:px-4`
- `icon`: `h-10 w-10 touch:h-11 touch:w-11`
- `lg`: already 48px, no change

**4. `src/components/polar/NestoInput.tsx`**
Input element: add `touch:h-11`

**5. `src/components/polar/NestoTabs.tsx`**
Tab `<button>`: add `touch:min-h-11` (currently only `pb-3`)

## Active-state verification (point 1)
Collapsed sidebar items render highlight via `w-full bg-accent` on the button itself, not the icon. Adding `touch:min-h-11` enlarges the same button → highlight scales with it. Active-state remains visible and proportional. No tweaks needed.

## Magic Keyboard note (point 2)
Noted as known limitation. Out-of-scope for this sprint — will not add user-preference toggle. Pura Vida iPad is wall-mounted touch-only, so no impact for them.

## Verification after build
1. DevTools → toggle "CSS media features" → `pointer: coarse` → sidebar/buttons/inputs/tabs grow to 44px
2. Toggle off → desktop heights restored (28/32/40px)
3. Active sidebar item highlight remains visible in both modes
4. `npx tsc --noEmit` green

## Deliverables
- Diff of tailwind.config.ts
- Diff of 4 components (NestoSidebar, NestoButton, NestoInput, NestoTabs)
- DevTools verification description (pointer toggle behaviour)
- TypeScript-clean confirmation
