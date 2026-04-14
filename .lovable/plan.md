

# Communicatie Instellingen: Tabs naar Card Grid

## Overzicht
Refactor Communicatie van 4 tabs naar card grid hub met 4 detail pagina's, identiek aan Marketing/Assistent/Onboarding.

## Stap 1: `src/lib/settingsRouteConfig.ts`

Voeg `communicatieConfig` toe en registreer in `settingsModules`:

```typescript
import { ..., Mail, Palette, MessagesSquare, MessageSquare } from "lucide-react";

export const communicatieConfig: SettingsModuleConfig = {
  id: "communicatie",
  label: "Communicatie",
  basePath: "/instellingen/communicatie",
  description: "Email opmaak, branding, gastberichten en WhatsApp",
  sections: [
    { id: "email-opmaak", label: "E-mail opmaak", path: "/instellingen/communicatie/email-opmaak", description: "Lay-out en styling van emails", icon: Mail },
    { id: "branding", label: "Branding", path: "/instellingen/communicatie/branding", description: "Logo, kleuren en footer", icon: Palette },
    { id: "gastberichten", label: "Gastberichten", path: "/instellingen/communicatie/gastberichten", description: "Berichten naar gasten configureren", icon: MessagesSquare },
    { id: "whatsapp", label: "WhatsApp", path: "/instellingen/communicatie/whatsapp", description: "WhatsApp kanaal instellingen", icon: MessageSquare },
  ],
};

export const settingsModules: SettingsModuleConfig[] = [
  reserveringenConfig, marketingConfig, onboardingConfig, assistentConfig, communicatieConfig,
];
```

## Stap 2: Hub pagina herschrijven — `src/pages/settings/SettingsCommunicatie.tsx`

```tsx
import { SettingsModuleLayout } from "@/components/settings/layouts";
import { communicatieConfig } from "@/lib/settingsRouteConfig";

export default function SettingsCommunicatie() {
  return <SettingsModuleLayout config={communicatieConfig} />;
}
```

## Stap 3: 4 detail pagina's in `src/pages/settings/communicatie/`

**SettingsCommunicatieEmailOpmaak.tsx** — bevat de volledige huisstijl tab content (afzender, branding, kanalen) uit het oude bestand:
```tsx
import { SettingsDetailLayout } from "@/components/settings/layouts/SettingsDetailLayout";
// + alle huidige imports (useState, useEffect, useCommunicationSettings, etc.)
// Content = exacte huisstijl tab content uit het huidige SettingsCommunicatie.tsx (regels 153-307)

export default function SettingsCommunicatieEmailOpmaak() {
  // Alle state, hooks en logica van het oude bestand
  return (
    <SettingsDetailLayout
      title="E-mail opmaak"
      description="Lay-out en styling van emails."
      breadcrumbs={[
        { label: "Instellingen", path: "/instellingen/voorkeuren" },
        { label: "Communicatie", path: "/instellingen/communicatie" },
        { label: "E-mail opmaak" },
      ]}
    >
      {/* NestoCard met branding + afzender + kanalen secties */}
    </SettingsDetailLayout>
  );
}
```

**SettingsCommunicatieBranding.tsx:**
```tsx
import { SettingsDetailLayout } from "@/components/settings/layouts/SettingsDetailLayout";
import { BrandingTab } from "@/components/settings/communication/BrandingTab";

export default function SettingsCommunicatieBranding() {
  return (
    <SettingsDetailLayout
      title="Branding"
      description="Logo, kleuren en footer."
      breadcrumbs={[
        { label: "Instellingen", path: "/instellingen/voorkeuren" },
        { label: "Communicatie", path: "/instellingen/communicatie" },
        { label: "Branding" },
      ]}
    >
      <BrandingTab />
    </SettingsDetailLayout>
  );
}
```

**SettingsCommunicatieGastberichten.tsx:**
```tsx
import { SettingsDetailLayout } from "@/components/settings/layouts/SettingsDetailLayout";
import { GastberichtenTab } from "@/components/settings/communication/GastberichtenTab";

export default function SettingsCommunicatieGastberichten() {
  return (
    <SettingsDetailLayout
      title="Gastberichten"
      description="Berichten naar gasten configureren."
      breadcrumbs={[
        { label: "Instellingen", path: "/instellingen/voorkeuren" },
        { label: "Communicatie", path: "/instellingen/communicatie" },
        { label: "Gastberichten" },
      ]}
    >
      <GastberichtenTab />
    </SettingsDetailLayout>
  );
}
```

**SettingsCommunicatieWhatsApp.tsx:**
```tsx
import { SettingsDetailLayout } from "@/components/settings/layouts/SettingsDetailLayout";
import { WhatsAppTab } from "@/components/settings/communication/WhatsAppTab";

export default function SettingsCommunicatieWhatsApp() {
  return (
    <SettingsDetailLayout
      title="WhatsApp"
      description="WhatsApp kanaal instellingen."
      breadcrumbs={[
        { label: "Instellingen", path: "/instellingen/voorkeuren" },
        { label: "Communicatie", path: "/instellingen/communicatie" },
        { label: "WhatsApp" },
      ]}
    >
      <WhatsAppTab />
    </SettingsDetailLayout>
  );
}
```

## Stap 4: `src/App.tsx`

Imports + 4 nieuwe routes:
```tsx
import SettingsCommunicatieEmailOpmaak from "./pages/settings/communicatie/SettingsCommunicatieEmailOpmaak";
import SettingsCommunicatieBranding from "./pages/settings/communicatie/SettingsCommunicatieBranding";
import SettingsCommunicatieGastberichten from "./pages/settings/communicatie/SettingsCommunicatieGastberichten";
import SettingsCommunicatieWhatsApp from "./pages/settings/communicatie/SettingsCommunicatieWhatsApp";

// Routes (na de bestaande /instellingen/communicatie route):
<Route path="/instellingen/communicatie/email-opmaak" element={<SettingsCommunicatieEmailOpmaak />} />
<Route path="/instellingen/communicatie/branding" element={<SettingsCommunicatieBranding />} />
<Route path="/instellingen/communicatie/gastberichten" element={<SettingsCommunicatieGastberichten />} />
<Route path="/instellingen/communicatie/whatsapp" element={<SettingsCommunicatieWhatsApp />} />
```

## Stap 5: Update redirect in `SettingsReserveringenNotificaties.tsx`

Update de navigatie-link van `/instellingen/communicatie` naar `/instellingen/communicatie/gastberichten`.

## Bestanden

| Bestand | Actie |
|---|---|
| `src/lib/settingsRouteConfig.ts` | `communicatieConfig` toevoegen |
| `src/pages/settings/SettingsCommunicatie.tsx` | Herschrijven naar hub |
| `src/pages/settings/communicatie/SettingsCommunicatieEmailOpmaak.tsx` | Nieuw — huisstijl content |
| `src/pages/settings/communicatie/SettingsCommunicatieBranding.tsx` | Nieuw |
| `src/pages/settings/communicatie/SettingsCommunicatieGastberichten.tsx` | Nieuw |
| `src/pages/settings/communicatie/SettingsCommunicatieWhatsApp.tsx` | Nieuw |
| `src/pages/settings/reserveringen/SettingsReserveringenNotificaties.tsx` | Redirect URL updaten |
| `src/App.tsx` | 4 imports + 4 routes |

