

# QR-code: Client-side met qrcode.react

## Waarom
De manage-URL bevat een geheim token waarmee reserveringen gewijzigd/geannuleerd kunnen worden. Een externe API zoals `api.qrserver.com` ontvangt die URL als parameter — dat is een privacy-risico. Client-side rendering voorkomt dit volledig.

## Aanpak

### 1. Dependency toevoegen
Installeer `qrcode.react` — een lichtgewicht React component (~15KB gzipped) die QR-codes volledig in de browser rendert via Canvas of SVG. Geen externe calls.

### 2. Wijziging: `src/components/booking/ConfirmationStep.tsx`

**Verwijderen (regels 74-82):** Het nep QR-grid met de hardcoded 4x4 squares:
```
<div className="w-16 h-16 bg-gray-100 rounded-lg ...">
  <div className="grid grid-cols-4 gap-0.5">
    {Array.from({ length: 16 }).map(...)}
  </div>
</div>
```

**Vervangen door:** Een `QRCodeSVG` component uit `qrcode.react` die de manage-URL rendert.

- SVG-variant (scherp op elk schermformaat, retina-proof)
- Formaat: 80x80px (past in de huidige container)
- Alleen getoond als `bookingResult?.manage_token` bestaat
- Label eronder: "Scan om te beheren" in klein grijs tekst
- Wanneer er geen token is, wordt het hele dashed-border blok verborgen

### Geen verdere wijzigingen

De "Reservering beheren" tekstlink blijft ook bestaan als fallback voor gebruikers die niet kunnen scannen.

