import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";

// Pages
import { AppShell } from "./components/layout/AppShell";
import Dashboard from "./pages/Dashboard";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="nesto-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner 
          position="top-right"
          toastOptions={{
            classNames: {
              toast: 'nesto-toast',
              title: 'nesto-toast-title',
              description: 'nesto-toast-description',
              success: 'nesto-toast-success',
              error: 'nesto-toast-error',
              warning: 'nesto-toast-warning',
              info: 'nesto-toast-info',
            },
          }}
        />
        <BrowserRouter>
          <Routes>
            {/* Layout wrapper - persistent sidebar */}
            <Route element={<AppShell />}>
              {/* Dashboard */}
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Navigate to="/" replace />} />
              
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
              
              {/* Settings */}
              <Route path="/instellingen/voorkeuren" element={<SettingsVoorkeuren />} />
              <Route path="/instellingen/keuken" element={<SettingsKeuken />} />
              <Route path="/instellingen/inkoop" element={<SettingsInkoop />} />
              <Route path="/instellingen/leveranciers" element={<SettingsLeveranciers />} />
            </Route>
            
            {/* Catch-all outside layout */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
