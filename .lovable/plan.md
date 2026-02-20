

# Buttons afronden en consistenter maken

## Wat verandert

Beide CTA-knoppen ("Volgende 1/2" en "Bevestigen") krijgen dezelfde styling:
- Border-radius van `rounded-[10px]` (10px) naar `rounded-2xl` (16px) -- past bij de ticket-cards en input fields
- Beide knoppen krijgen dezelfde hover/active effecten: `hover:scale-[1.02] hover:shadow-md active:scale-[0.98]`
- Hoogte en kleur blijven identiek (#1a1a1a, h-12)

## Technisch

### Bestand 1: `src/pages/BookingWidget.tsx` (regel 195)
De "Volgende" knop:
```
// Was:
className="w-full h-12 rounded-[10px] text-sm font-semibold ..."

// Wordt:
className="w-full h-12 rounded-2xl text-sm font-semibold ... hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
```

### Bestand 2: `src/components/booking/GuestDetailsStep.tsx` (regel 200)
De "Bevestigen" knop:
```
// Was:
className="w-full h-12 rounded-[10px] text-white font-semibold ..."

// Wordt:
className="w-full h-12 rounded-2xl text-white font-semibold ..."
```

Twee kleine wijzigingen, visueel veel rustiger en consistenter.
