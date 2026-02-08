

## Modal overlay en shadow moderniseren

### Wijzigingen

**1. `src/components/ui/dialog.tsx` (regel 22)**
Overlay van `bg-black/80` naar `bg-black/20 backdrop-blur-sm`:
```
"fixed inset-0 z-50 bg-black/20 backdrop-blur-sm data-[state=open]:animate-in ..."
```

DialogContent (regel 43) shadow van `shadow-lg` naar `shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]`:
```
"... shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] duration-200 ..."
```

**2. `src/components/ui/alert-dialog.tsx` (regel 19)**
Zelfde overlay wijziging: `bg-black/80` naar `bg-black/20 backdrop-blur-sm`

AlertDialogContent (regel 37) shadow van `shadow-lg` naar `shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]`

**3. `docs/design/MODAL_PATTERNS.md`**
Voeg een "Overlay en Shadow" sectie toe:
- Overlay: `bg-black/20 backdrop-blur-sm` (niet `bg-black/80`)
- Modal shadow: `shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]`
- De lichtere overlay met blur geeft een moderne, cleanere look
- De sterkere shadow compenseert en houdt de modal prominent

### Overzicht

| Bestand | Wijziging |
|---|---|
| `dialog.tsx` | Overlay `bg-black/80` naar `bg-black/20 backdrop-blur-sm`, shadow naar `shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]` |
| `alert-dialog.tsx` | Idem |
| `MODAL_PATTERNS.md` | Nieuwe sectie "Overlay en Shadow" |

