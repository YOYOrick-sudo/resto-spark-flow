# NESTO PROJECT ROADMAP
Laatst bijgewerkt: 3 januari 2026

## PROJECT OVERZICHT
Nesto is een SaaS platform voor horeca management met modules voor reserveringen, keuken, kaartbeheer, en meer. Multi-tenant architectuur waarbij elke organization meerdere locations kan hebben, met per-location billing en module entitlements.

---

## HUIDIGE STATUS

### AFGEROND
- ✅ Fase 1: Design System
- ✅ Fase 2: Navigatie & Layout  
- ✅ Fase 3: UI Patterns
- ✅ Fase 4.1: SaaS Foundation

### IN UITVOERING
- 🔄 Fase 4.2: Reserveringen Module Basis

---

## FASE 4.1: SAAS FOUNDATION ✅ AFGEROND
Status: Compleet (3 januari 2026)

### Wat is gedaan:
- [x] Lovable Cloud geactiveerd
- [x] 16 database tabellen aangemaakt
- [x] 4 custom enums (platform_role, location_role, module_key, employee_status)
- [x] Security definer functions (is_platform_admin, get_user_context, etc.)
- [x] Complete RLS policies voor alle tabellen
- [x] Seed data (45+ permissions, 6 permission sets, 5 role mappings)
- [x] AuthContext met login/signup
- [x] UserContext met centrale get_user_context()
- [x] Permission en Entitlement hooks
- [x] Navigation builder gebaseerd op context
- [x] Protected routes met ProtectedRoute component
- [x] Auth pagina (/auth) met login en registratie

### Architectuur Beslissingen:
- Platform roles zijn globaal in profiles tabel (niet per org)
- get_user_context() is de centrale bron voor role, permissions, entitlements
- 1 permission_set per location_role (UNIQUE constraint)
- Employee portal staat los van operationele rollen
- Platform admin is primair read-only

---

## FASE 4.2: RESERVERINGEN MODULE BASIS
Status: Nog te starten

### 4.2.1 Database Schema
- [ ] Areas tabel (binnen location)
- [ ] TableGroups tabel (binnen area)
- [ ] Tables tabel (met capacity, status)
- [ ] Reservations tabel
- [ ] Guests tabel
- [ ] ReservationSettings tabel

### 4.2.2 Shifts & Time Slots
- [ ] Shifts tabel (lunch, diner, etc.)
- [ ] TimeSlots tabel
- [ ] Availability logic

### 4.2.3 CRUD Operations
- [ ] Reservation create/update/delete
- [ ] Guest management
- [ ] Table assignment

---

## FASE 5: KEUKEN MODULE
Status: Nog te starten

### 5.1 MEP Taken
- [ ] MEP tasks tabel
- [ ] Templates per dag/shift
- [ ] Check-off functionaliteit

### 5.2 Recepten & Halffabricaten
- [ ] Recepten CRUD
- [ ] Halffabricaten CRUD
- [ ] Ingrediënten CRUD
- [ ] Relaties tussen recepten/halffabricaten/ingrediënten

### 5.3 Kostprijzen
- [ ] Kostprijs berekening
- [ ] Food cost percentage
- [ ] Marges

---

## FASE 6: KAARTBEHEER MODULE
Status: Nog te starten

- [ ] Gerechten overzicht
- [ ] Menu samenstelling
- [ ] Menu engineering (populariteit/winstgevendheid)

---

## FASE 7: EMPLOYEE PORTAL
Status: Nog te starten

- [ ] Employee invite flow
- [ ] Employee login (via bestaande auth)
- [ ] Contracts bekijken
- [ ] Payslips bekijken
- [ ] Onboarding tasks

---

## FASE 8: ADMIN PANEL (PLATFORM)
Status: Nog te starten

- [ ] Platform admin dashboard
- [ ] Organization management
- [ ] Location management
- [ ] Entitlements toggle per location
- [ ] Subscription management

---

## FASE 9: BILLING & SUBSCRIPTIONS
Status: Nog te starten

- [ ] Stripe integratie
- [ ] Checkout flow
- [ ] Subscription management
- [ ] Usage-based pricing per location

---

## FASE 10: POLISH & LAUNCH
Status: Nog te starten

- [ ] Performance optimalisatie
- [ ] Error handling
- [ ] Accessibility
- [ ] Security audit
- [ ] Launch

---

## TECHNISCHE NOTITIES

### Database Structuur
Zie `docs/DATABASE.md` voor complete schema documentatie.

### Authenticatie Flow
1. User registreert via /auth
2. Profile wordt automatisch aangemaakt via trigger
3. Org membership + location role moet handmatig worden toegevoegd
4. Bij login wordt get_user_context() aangeroepen voor permissions

### Navigation Gating
Menu items worden gefilterd op:
1. Module entitlement (location_entitlements.enabled)
2. Root view permission (bijv. kitchen.view)

### Device Modes (Toekomstig)
- manager_desktop: volledige UI
- service_tablet: reserveringen focus
- kitchen_tablet: keuken focus
- employee_portal: HR documenten

---

## SESSIE LOG

### 3 januari 2026
- Fase 4.1 SaaS Foundation geïmplementeerd
- 16 database tabellen aangemaakt
- Complete RLS policies
- Auth context en user context
- Navigation builder
- Documentatie aangemaakt
