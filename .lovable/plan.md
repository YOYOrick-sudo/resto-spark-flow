

## Check: routing-structuur in App.tsx

Goede vraag — ik heb dit nagekeken in de huidige `App.tsx`. De admin routes staan **al correct buiten** de `ProtectedRoute` + `AppShell` wrapper. Hier is het relevante stuk:

```tsx
<Routes>
  {/* Public routes */}
  <Route path="/auth" element={<AuthPage />} />
  <Route path="/book/:slug" element={<BookingWidget />} />
  <Route path="/manage/:token" element={<ManageReservation />} />
  <Route path="/waitlist/accept/:token" element={<WaitlistAccept />} />
  <Route path="/reconfirm/:token" element={<ReconfirmReservation />} />
  <Route path="/panel-demo" element={<PanelDemo />} />
  <Route path="/widget-preview" element={<WidgetPreviewDemo />} />
  <Route path="/widget-mockups" element={<WidgetMockups />} />
  <Route path="/popup-preview" element={<PopupPreviewDemo />} />
  
  {/* Admin Panel — eigen layout, eigen guard */}
  <Route path="/nesto-admin" element={<AdminRouteGuard />}>
    <Route element={<AdminLayout />}>
      <Route index element={<AdminDashboard />} />
    </Route>
    <Route path="mfa-setup" element={<MFAEnrollmentPage />} />
  </Route>
  
  {/* Protected routes - Layout wrapper with persistent sidebar */}
  <Route element={
    <ProtectedRoute>
      <AppShell />
    </ProtectedRoute>
  }>
    <Route path="/" element={<Dashboard />} />
    {/* ... alle restaurant routes ... */}
  </Route>
  
  <Route path="*" element={<NotFound />} />
</Routes>
```

### Wat klopt
- `/nesto-admin` staat **vóór** de `ProtectedRoute` block → wordt eerst gematcht
- `AdminRouteGuard` is een eigen guard, geen child van `ProtectedRoute`
- `AdminLayout` is apart, geen `AppShell` (geen restaurant-sidebar)
- `mfa-setup` is een sibling van de `AdminLayout`-wrapper → MFA enrollment heeft GEEN admin sidebar/dashboard chrome (correct, want je bent nog niet voldoende geauthenticeerd)

### Wat de echte oorzaak was
De redirect-loop kwam **niet** door de routing-structuur, maar door:
1. **Race condition** in `useAdminAuth` → `isLoading` werd te vroeg `false`, guard redirectte naar `/` voordat admin-check klaar was
2. **MFA-loop** in `AdminRouteGuard` → guard redirectte naar `/nesto-admin/mfa-setup` zelfs wanneer je al daar was

Beide zijn in de vorige stap gefixed. De routing zelf hoefde niet aangepast.

### Wat ik na approval doe

Niets aan de code. Je kunt nu testen:
1. Ga naar `/nesto-admin`
2. Verwacht: redirect naar `/nesto-admin/mfa-setup` met QR-code scherm
3. Scan met authenticator app, vul code in
4. Verwacht: redirect terug naar `/nesto-admin` met admin dashboard

Als er iets misgaat, deel je console-output (de `[useAdminAuth]` en `[AdminRouteGuard]` logs staan er nog in voor diagnose).

