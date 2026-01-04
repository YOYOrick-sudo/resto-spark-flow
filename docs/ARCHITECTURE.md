# NESTO ARCHITECTUUR

## Overzicht

Nesto is een multi-tenant SaaS platform voor horeca management. Dit document beschrijft de architectuurbeslissingen en randvoorwaarden.

---

## Architecture Lock (Fase 4.1 + 4.2)

**Gelocked op:** 4 januari 2026  
**Status:** DEFINITIEF - Wijzigingen vereisen expliciete review

### Scope Rules

| Scope | Beschrijving | Eigenaar |
|-------|--------------|----------|
| **Platform** | Globale toegang, niet gebonden aan org/location | Nesto team |
| **Organization** | Klantbedrijf wrapper, geen billing hier | Klant |
| **Location** | Vestiging, ALLES is per location | Klant |

### Onveranderlijke Principes

1. **Billing is per Location** - Nooit per Organization
2. **Entitlements zijn per Location** - Nooit per Organization  
3. **Roles zijn per Location** - Via `user_location_roles`
4. **Platform roles in `profiles.platform_role`** - Alleen `platform_admin` en `support`
5. **`get_user_context()` is de Single Source of Truth** - Geen losse permission queries

### Platform Role Capabilities

| Capability | platform_admin | support |
|------------|----------------|---------|
| Read all data (SELECT) | YES | YES |
| Mutate organizations | YES | NO |
| Mutate locations | YES | NO |
| Mutate subscriptions/entitlements | YES | NO |
| Mutate user roles | YES | NO |
| Bypass permission checks | YES | NO |

**Support Role Toekomst:** Huidige `support` role is read-only platform-wide (MVP placeholder). 
Toekomstige iteraties vervangen dit door expliciete grants of impersonation flow.

---

## Fase 4.2: Table Management Constraints

### Uniqueness Rules

| Entity | Scope | Case Sensitive | Constraint/Index |
|--------|-------|----------------|------------------|
| `areas.name` | Per location | Ja | `UNIQUE(location_id, name)` |
| `tables.table_number` | Per location | N.v.t. | `UNIQUE(location_id, table_number)` |
| `tables.display_label` | Per location (actief) | **Nee** | `idx_tables_display_label_active_ci` |
| `table_groups.name` | Per location | Ja | `UNIQUE(location_id, name)` |

### Table Group Overlap Policy

**MVP Regel:** Een tafel kan NIET in meerdere actieve, niet-system-generated groups zitten.

**Enforcement:**
- `trg_prevent_table_group_overlap` op INSERT/UPDATE van members
- `trg_check_group_activation_overlap` op UPDATE is_active van groups

**System-generated groups zijn uitgezonderd.**

### Auto-sync Behavior

| Trigger | Actie |
|---------|-------|
| `trg_sync_table_location` | Sync tables.location_id van area |
| `trg_update_table_group_caps` | Herbereken group capacities bij member changes |
| `trg_recalc_groups_for_table` | Herbereken groups bij table capacity changes |

---

## Tenant Structuur

```
Organization (klantbedrijf)
├── Location 1 (vestiging)
│   ├── Subscription (billing per location)
│   ├── Entitlements (modules per location)
│   └── Users (via user_location_roles)
├── Location 2
│   ├── Subscription
│   ├── Entitlements
│   └── Users
└── ...
```

### Kernprincipes:
1. **Organizations** zijn de tenant wrapper (klantbedrijf)
2. **Locations** zijn vestigingen onder een organization
3. **Billing en entitlements** zijn per location, niet per organization
4. **Users** zijn personen die via org_memberships aan organizations gekoppeld zijn
5. **Roles** worden per location toegewezen via user_location_roles

---

## Platform Roles (Globaal)

Platform roles zijn globaal en staan in de `profiles` tabel:

- `platform_admin`: Volledige toegang tot alle tenants, primair read-only
- `support`: Beperkte toegang voor support doeleinden

**Belangrijk:** Platform roles zijn NIET per organization. Een platform_admin heeft automatisch toegang tot alle data.

---

## Location Roles

Elke user kan per location een andere role hebben:

| Role | Beschrijving |
|------|--------------|
| `owner` | Volledige controle over location |
| `manager` | Dagelijkse operaties, geen team management |
| `service` | Reserveringen en service taken |
| `kitchen` | Keuken operaties |
| `finance` | Financiële rapportages |

---

## Module Entitlements

Modules worden per location ge-enabled/disabled:

| Module | Beschrijving |
|--------|--------------|
| `reservations` | Reserveringen, gasten, tafels |
| `kitchen` | MEP, recepten, ingrediënten, kostprijzen |
| `finance` | Financiële rapportages |
| `hrm` | Employee portal, contracten, payslips |
| `marketing` | Takeaway, campagnes |
| `settings` | Instellingen |

---

## Permissions Systeem

### Structuur:
```
permissions (individuele rechten)
    ↓
permission_sets (groepen van rechten)
    ↓
role_permission_sets (1 set per role)
    ↓
user_location_roles (user heeft role per location)
```

### Root View Permissions:
Elke module heeft een root view permission voor navigation gating:
- `reservations.view`
- `kitchen.view`
- `finance.view`
- `hrm.view`
- `marketing.view`
- `settings.view`

---

## Centrale Context: get_user_context()

De `get_user_context()` functie is de CENTRALE BRON voor alle access control:

```typescript
interface UserContext {
  user_id: string;
  location_id: string;
  organization_id: string;
  role: LocationRole | null;
  is_platform_admin: boolean;
  is_platform_user: boolean;
  permissions: string[];
  entitlements: ModuleEntitlement[];
}
```

### Gebruik:
1. Wordt aangeroepen bij app start en location switch
2. Opgeslagen in React Context
3. Alle permission/entitlement checks lezen uit deze context
4. **GEEN** losse database queries voor permission checks

---

## Navigation Gating

Menu items worden gefilterd op basis van:

1. **Module entitlement**: Is de module enabled voor deze location?
2. **Root view permission**: Heeft de user ${module}.view permission?

```typescript
const isVisible = hasEntitlement(moduleKey) && hasPermission(`${moduleKey}.view`);
```

---

## Employee Portal

Het employee portal is een aparte access flow:

1. Managers maken employees aan (zonder user account)
2. Employee krijgt invite via email
3. Employee maakt account aan of linkt bestaand account
4. Employee ziet alleen HR documenten (employee_selfservice permission set)

**Belangrijk:** Employees hebben geen operationele rollen. Hun permissions komen uitsluitend uit de `employee_selfservice` permission set.

---

## RLS Policy Patroon

Alle tabellen volgen dit patroon:

### SELECT:
- Platform users: alle data
- Org members: alleen eigen organization
- Location roles: alleen eigen locations

### INSERT/UPDATE/DELETE:
- Platform admin: beperkt tot core entities (organizations, locations, entitlements)
- Owners: volledige CRUD binnen hun locations
- Managers: operationele CRUD
- Other roles: beperkt per permission

---

## Device Modes

Device modes zijn UI presets, GEEN autorisatie:

| Mode | Default Route | Nav Layout |
|------|---------------|------------|
| `manager_desktop` | /dashboard | full |
| `service_tablet` | /reserveringen | minimal |
| `kitchen_tablet` | /mep | minimal |
| `employee_portal` | /employee | employee |

**Belangrijk:** Security blijft via entitlements + permissions. Device modes bepalen alleen UI.

---

## Security Randvoorwaarden

1. **RLS op alle tabellen** - Geen uitzonderingen
2. **Security definer functions** - Voorkom RLS recursie
3. **Platform admin read-only** - Tenzij expliciet anders
4. **No client-side auth checks** - Alleen server-side via RLS
5. **Input validatie met Zod** - Op alle forms

---

## Bestandsstructuur

```
src/
├── contexts/
│   ├── AuthContext.tsx      # Login/logout, session
│   └── UserContext.tsx      # Central context provider
├── hooks/
│   ├── usePermission.ts     # Permission checks
│   └── useEntitlement.ts    # Entitlement checks
├── types/
│   └── auth.ts              # Type definitions
├── lib/
│   ├── navigation.ts        # Menu items
│   └── navigationBuilder.ts # Context-based filtering
└── components/
    └── auth/
        └── ProtectedRoute.tsx
```
