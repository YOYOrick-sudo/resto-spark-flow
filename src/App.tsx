import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { UserContextProvider } from "@/contexts/UserContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Pages
import { AppShell } from "./components/layout/AppShell";
import Dashboard from "./pages/Dashboard";
import Assistent from "./pages/Assistent";
import Reserveringen from "./pages/Reserveringen";
import MepTaken from "./pages/MepTaken";
import Halffabricaten from "./pages/Halffabricaten";
import HalffabricatenDetail from "./pages/HalffabricatenDetail";
import Recepten from "./pages/Recepten";
import ReceptenDetail from "./pages/ReceptenDetail";
import Ingredienten from "./pages/Ingredienten";
import Kostprijzen from "./pages/Kostprijzen";
import Inkoop from "./pages/Inkoop";
import Kaartbeheer from "./pages/Kaartbeheer";
import KaartbeheerDetail from "./pages/KaartbeheerDetail";
import Taken from "./pages/Taken";
import SettingsVoorkeuren from "./pages/SettingsVoorkeuren";
import SettingsKeuken from "./pages/SettingsKeuken";
import SettingsInkoop from "./pages/SettingsInkoop";
import SettingsLeveranciers from "./pages/SettingsLeveranciers";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/Auth";
import OnboardingPage from "./pages/OnboardingPage";
import OnboardingDetail from "./pages/OnboardingDetail";
import SettingsOnboarding from "./pages/settings/SettingsOnboarding";
import SettingsCommunicatie from "./pages/settings/SettingsCommunicatie";

// New multi-level settings pages
import {
  SettingsReserveringenIndex,
  SettingsReserveringenPacing,
  SettingsReserveringenTafels,
  SettingsReserveringenTafelsLocatie,
  SettingsReserveringenTafelsAreas,
  SettingsReserveringenTafelsGroepen,
  SettingsReserveringenShiftTijden,
  SettingsReserveringenNotificaties,
  SettingsReserveringenShifts,
  SettingsReserveringenTickets,
} from "./pages/settings/reserveringen";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="nesto-theme">
      <AuthProvider>
        <UserContextProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Public routes */}
                <Route path="/auth" element={<AuthPage />} />
                
                {/* Protected routes - Layout wrapper with persistent sidebar */}
                <Route element={
                  <ProtectedRoute>
                    <AppShell />
                  </ProtectedRoute>
                }>
                  {/* Dashboard */}
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/dashboard" element={<Navigate to="/" replace />} />
                  
                  {/* Assistent */}
                  <Route path="/assistent" element={<Assistent />} />
                  
                  {/* Reserveringen */}
                  <Route path="/reserveringen" element={<Reserveringen />} />
                  
                  {/* Keuken */}
                  <Route path="/mep" element={<MepTaken />} />
                  <Route path="/halffabricaten" element={<Halffabricaten />} />
                  <Route path="/halffabricaten/:id" element={<HalffabricatenDetail />} />
                  <Route path="/recepten" element={<Recepten />} />
                  <Route path="/recepten/:id" element={<ReceptenDetail />} />
                  <Route path="/voorraad" element={<Ingredienten />} />
                  <Route path="/kostprijzen" element={<Kostprijzen />} />
                  <Route path="/inkoop" element={<Inkoop />} />
                  
                  {/* Kaartbeheer */}
                  <Route path="/kaartbeheer" element={<Kaartbeheer />} />
                  <Route path="/kaartbeheer/:id" element={<KaartbeheerDetail />} />
                  
                  {/* Service */}
                  <Route path="/taken" element={<Taken />} />
                  
                  {/* Onboarding */}
                  <Route path="/onboarding" element={<OnboardingPage />} />
                  <Route path="/onboarding/:id" element={<OnboardingDetail />} />
                  
                  {/* Settings - Legacy */}
                  <Route path="/instellingen/voorkeuren" element={<SettingsVoorkeuren />} />
                  <Route path="/instellingen/keuken" element={<SettingsKeuken />} />
                  <Route path="/instellingen/inkoop" element={<SettingsInkoop />} />
                  <Route path="/instellingen/leveranciers" element={<SettingsLeveranciers />} />
                  <Route path="/instellingen/onboarding" element={<SettingsOnboarding />} />
                  <Route path="/instellingen/communicatie" element={<SettingsCommunicatie />} />
                  
                  {/* Settings - Reserveringen (Multi-level) */}
                  <Route path="/instellingen/reserveringen" element={<SettingsReserveringenIndex />} />
                  <Route path="/instellingen/reserveringen/pacing" element={<SettingsReserveringenPacing />} />
                  <Route path="/instellingen/reserveringen/tafels" element={<SettingsReserveringenTafels />} />
                  <Route path="/instellingen/reserveringen/tafels/locatie" element={<SettingsReserveringenTafelsLocatie />} />
                  <Route path="/instellingen/reserveringen/tafels/areas" element={<SettingsReserveringenTafelsAreas />} />
                  <Route path="/instellingen/reserveringen/tafels/tafelgroepen" element={<SettingsReserveringenTafelsGroepen />} />
                  <Route path="/instellingen/reserveringen/shifts" element={<SettingsReserveringenShifts />} />
                  <Route path="/instellingen/reserveringen/tickets" element={<SettingsReserveringenTickets />} />
                  <Route path="/instellingen/reserveringen/shift-tijden" element={<SettingsReserveringenShiftTijden />} />
                  <Route path="/instellingen/reserveringen/notificaties" element={<SettingsReserveringenNotificaties />} />
                </Route>
                
                {/* Catch-all outside layout */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </UserContextProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
