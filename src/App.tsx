import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { UserContextProvider } from "@/contexts/UserContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { NestoErrorBoundary } from "@/components/polar/NestoErrorBoundary";

// Pages
import { AppShell } from "./components/layout/AppShell";
import Dashboard from "./pages/Dashboard";
import Assistent from "./pages/Assistent";
import Reserveringen from "./pages/Reserveringen";
import MepTaken from "./pages/MepTaken";
import Recepten from "./pages/Recepten";
import ReceptenDetail from "./pages/ReceptenDetail";
import Ingredienten from "./pages/Ingredienten";
import Inkoop from "./pages/Inkoop";
import Leveranciers from "./pages/Leveranciers";
import Kaartbeheer from "./pages/Kaartbeheer";
import KaartbeheerDetail from "./pages/KaartbeheerDetail";
import KaartbeheerMenus from "./pages/KaartbeheerMenus";
import KaartbeheerMenuEngineering from "./pages/KaartbeheerMenuEngineering";
import Taken from "./pages/Taken";
import PanelDemo from "./pages/PanelDemo";
import SettingsVoorkeuren from "./pages/SettingsVoorkeuren";
import SettingsKeuken from "./pages/SettingsKeuken";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/Auth";
import BookingWidget from "./pages/BookingWidget";
import ManageReservation from "./pages/ManageReservation";
import WidgetPreviewDemo from "./pages/WidgetPreviewDemo";
import WidgetMockups from "./pages/WidgetMockups";
import PopupPreviewDemo from "./pages/PopupPreviewDemo";
import OnboardingPage from "./pages/OnboardingPage";
import OnboardingDetail from "./pages/OnboardingDetail";
import SettingsOnboarding from "./pages/settings/SettingsOnboarding";
import SettingsCommunicatie from "./pages/settings/SettingsCommunicatie";
import SettingsAssistent from "./pages/settings/SettingsAssistent";
import SettingsBetalingen from "./pages/settings/SettingsBetalingen";
import MarketingSettings from "./pages/marketing/MarketingSettings";

// Marketing settings detail pages
import SettingsMarketingAlgemeen from "./pages/settings/marketing/SettingsMarketingAlgemeen";
import SettingsMarketingBrandKit from "./pages/settings/marketing/SettingsMarketingBrandKit";
import SettingsMarketingEmail from "./pages/settings/marketing/SettingsMarketingEmail";
import SettingsMarketingFlows from "./pages/settings/marketing/SettingsMarketingFlows";
import SettingsMarketingGDPR from "./pages/settings/marketing/SettingsMarketingGDPR";
import SettingsMarketingSocial from "./pages/settings/marketing/SettingsMarketingSocial";
import SettingsMarketingPopup from "./pages/settings/marketing/SettingsMarketingPopup";
import SettingsMarketingReviews from "./pages/settings/marketing/SettingsMarketingReviews";

// Onboarding settings detail pages
import SettingsOnboardingFasen from "./pages/settings/onboarding/SettingsOnboardingFasen";
import SettingsOnboardingTeam from "./pages/settings/onboarding/SettingsOnboardingTeam";
import SettingsOnboardingTemplates from "./pages/settings/onboarding/SettingsOnboardingTemplates";
import SettingsOnboardingReminders from "./pages/settings/onboarding/SettingsOnboardingReminders";

// Assistent settings detail pages
import SettingsAssistentKnowledge from "./pages/settings/assistent/SettingsAssistentKnowledge";
import SettingsAssistentAgent from "./pages/settings/assistent/SettingsAssistentAgent";
import SettingsAssistentPermissions from "./pages/settings/assistent/SettingsAssistentPermissions";
import SegmentsPage from "./pages/marketing/SegmentsPage";
import ContactsPage from "./pages/marketing/ContactsPage";
import CampaignesPage from "./pages/marketing/CampaignesPage";
import CampaignBuilderPage from "./pages/marketing/CampaignBuilderPage";
import MarketingDashboard from "./pages/marketing/MarketingDashboard";
import ContentCalendarPage from "./pages/marketing/ContentCalendarPage";
import SocialPostsPage from "./pages/marketing/SocialPostsPage";
import SocialPostCreatorPage from "./pages/marketing/SocialPostCreatorPage";
import ReviewsPage from "./pages/marketing/ReviewsPage";
import PopupPage from "./pages/marketing/PopupPage";
import AnalyticsPage from "./pages/analytics/AnalyticsPage";
import WasteDetailPage from "./pages/analytics/detail/WasteDetailPage";
import ReviewsDetailPage from "./pages/analytics/detail/ReviewsDetailPage";
import BereikDetailPage from "./pages/analytics/detail/BereikDetailPage";
import InterneBestellingen from "./pages/InterneBestellingen";
import WaitlistAccept from "./pages/WaitlistAccept";
import ReconfirmReservation from "./pages/ReconfirmReservation";

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
  SettingsReserveringenTicketDetail,
  SettingsReserveringenBeleid,
  SettingsReserveringenWidget,
  SettingsReserveringenWachtlijst,
} from "./pages/settings/reserveringen";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="nesto-theme">
      <AuthProvider>
        <UserContextProvider>
          <TooltipProvider>
            <Sonner />
            <BrowserRouter>
              <NestoErrorBoundary>
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
                
                {/* Protected routes - Layout wrapper with persistent sidebar */}
                <Route element={
                  <ProtectedRoute>
                    <AppShell />
                  </ProtectedRoute>
                }>
                  {/* Dashboard */}
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/dashboard" element={<Navigate to="/" replace />} />
                  
                  {/* Reserveringen */}
                  <Route path="/reserveringen" element={<Reserveringen />} />
                  
                  {/* Assistent */}
                  <Route path="/assistent" element={<Assistent />} />
                  
                  {/* Keuken */}
                  <Route path="/mep" element={<MepTaken />} />
                  <Route path="/halffabricaten" element={<Navigate to="/recepten" replace />} />
                  <Route path="/halffabricaten/:id" element={<Navigate to="/recepten" replace />} />
                  <Route path="/recepten" element={<Recepten />} />
                  <Route path="/recepten/:id" element={<ReceptenDetail />} />
                  <Route path="/voorraad" element={<Ingredienten />} />
                  <Route path="/kostprijzen" element={<Navigate to="/voorraad" replace />} />
                  <Route path="/inkoop" element={<Inkoop />} />
                  <Route path="/inkoop/leveranciers" element={<Leveranciers />} />
                  <Route path="/interne-bestellingen" element={<InterneBestellingen />} />
                  <Route path="/taken" element={<Taken />} />
                  
                  {/* Kaartbeheer */}
                  <Route path="/kaartbeheer" element={<Kaartbeheer />} />
                  <Route path="/kaartbeheer/menus" element={<KaartbeheerMenus />} />
                  <Route path="/kaartbeheer/menu-engineering" element={<KaartbeheerMenuEngineering />} />
                  <Route path="/kaartbeheer/:id" element={<KaartbeheerDetail />} />
                  
                  {/* Onboarding */}
                  <Route path="/onboarding" element={<OnboardingPage />} />
                  <Route path="/onboarding/:id" element={<OnboardingDetail />} />
                  
                  {/* Settings */}
                  <Route path="/instellingen/voorkeuren" element={<SettingsVoorkeuren />} />
                  <Route path="/instellingen/keuken" element={<SettingsKeuken />} />
                  <Route path="/instellingen/onboarding" element={<SettingsOnboarding />} />
                  <Route path="/instellingen/communicatie" element={<SettingsCommunicatie />} />
                  <Route path="/instellingen/assistent" element={<SettingsAssistent />} />
                  <Route path="/instellingen/betalingen" element={<SettingsBetalingen />} />
                  <Route path="/instellingen/marketing" element={<MarketingSettings />} />
                  <Route path="/instellingen/inkoop" element={<Navigate to="/inkoop" replace />} />
                  <Route path="/instellingen/leveranciers" element={<Navigate to="/inkoop/leveranciers" replace />} />
                  
                  {/* Settings - Reserveringen (Multi-level) */}
                  <Route path="/instellingen/reserveringen" element={<SettingsReserveringenIndex />} />
                  <Route path="/instellingen/reserveringen/pacing" element={<SettingsReserveringenPacing />} />
                  <Route path="/instellingen/reserveringen/tafels" element={<SettingsReserveringenTafels />} />
                  <Route path="/instellingen/reserveringen/tafels/locatie" element={<SettingsReserveringenTafelsLocatie />} />
                  <Route path="/instellingen/reserveringen/tafels/areas" element={<SettingsReserveringenTafelsAreas />} />
                  <Route path="/instellingen/reserveringen/tafels/tafelgroepen" element={<SettingsReserveringenTafelsGroepen />} />
                  <Route path="/instellingen/reserveringen/shifts" element={<SettingsReserveringenShifts />} />
                  <Route path="/instellingen/reserveringen/tickets" element={<SettingsReserveringenTickets />} />
                  <Route path="/instellingen/reserveringen/tickets/nieuw" element={<SettingsReserveringenTicketDetail />} />
                  <Route path="/instellingen/reserveringen/tickets/:id" element={<SettingsReserveringenTicketDetail />} />
                  <Route path="/instellingen/reserveringen/beleid" element={<SettingsReserveringenBeleid />} />
                  <Route path="/instellingen/reserveringen/shift-tijden" element={<SettingsReserveringenShiftTijden />} />
                  <Route path="/instellingen/reserveringen/notificaties" element={<SettingsReserveringenNotificaties />} />
                  <Route path="/instellingen/reserveringen/widget" element={<SettingsReserveringenWidget />} />
                  <Route path="/instellingen/reserveringen/wachtlijst" element={<SettingsReserveringenWachtlijst />} />
                  
                  {/* Marketing */}
                  <Route path="/marketing" element={<MarketingDashboard />} />
                  <Route path="/marketing/campagnes" element={<CampaignesPage />} />
                  <Route path="/marketing/campagnes/nieuw" element={<CampaignBuilderPage />} />
                  <Route path="/marketing/segmenten" element={<SegmentsPage />} />
                  <Route path="/marketing/contacten" element={<ContactsPage />} />
                  <Route path="/marketing/kalender" element={<ContentCalendarPage />} />
                  <Route path="/marketing/social" element={<SocialPostsPage />} />
                  <Route path="/marketing/social/nieuw" element={<SocialPostCreatorPage />} />
                  <Route path="/marketing/reviews" element={<ReviewsPage />} />
                  <Route path="/marketing/popup" element={<PopupPage />} />
                  
                  {/* Analytics */}
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/analytics/waste" element={<WasteDetailPage />} />
                  <Route path="/analytics/reviews" element={<ReviewsDetailPage />} />
                  <Route path="/analytics/bereik" element={<BereikDetailPage />} />
                </Route>
                
                {/* Catch-all outside layout */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              </NestoErrorBoundary>
            </BrowserRouter>
          </TooltipProvider>
        </UserContextProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
