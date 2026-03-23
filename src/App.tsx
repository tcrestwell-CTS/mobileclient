import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { PortalAuthProvider } from "@/contexts/PortalAuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PortalProtectedRoute } from "@/components/client/PortalProtectedRoute";
import { PortalLayout } from "@/components/client/PortalLayout";
import { ScrollToTop } from "./components/ScrollToTop";

// ─── Lazy-loaded Agent Pages ──────────────────────────────────────────────────
// These are only loaded when the user navigates to that route,
// significantly reducing the initial bundle size and startup time.
const Index               = lazy(() => import("./pages/Index"));
const CRM                 = lazy(() => import("./pages/CRM"));
const ClientDetail        = lazy(() => import("./pages/ClientDetail"));
const Bookings            = lazy(() => import("./pages/Bookings"));
const BookingDetail       = lazy(() => import("./pages/BookingDetail"));
const Training            = lazy(() => import("./pages/Training"));
const Commissions         = lazy(() => import("./pages/Commissions"));
const CommissionReport    = lazy(() => import("./pages/CommissionReport"));
const Analytics           = lazy(() => import("./pages/Analytics"));
const Branding            = lazy(() => import("./pages/Branding"));
const Settings            = lazy(() => import("./pages/Settings"));
const TeamManagement      = lazy(() => import("./pages/TeamManagement"));
const Suppliers           = lazy(() => import("./pages/Suppliers"));
const SupplierDocs        = lazy(() => import("./pages/SupplierDocs"));
const Trips               = lazy(() => import("./pages/Trips"));
const TripDetail          = lazy(() => import("./pages/TripDetail"));
const ItineraryBuilder    = lazy(() => import("./pages/ItineraryBuilder"));
const Auth                = lazy(() => import("./pages/Auth"));
const NotFound            = lazy(() => import("./pages/NotFound"));
const SharedTrip          = lazy(() => import("./pages/SharedTrip"));
const GroupLanding        = lazy(() => import("./pages/GroupLanding"));
const GroupLandingBuilder = lazy(() => import("./pages/GroupLandingBuilder"));
const CCAuthorize         = lazy(() => import("./pages/CCAuthorize"));
const PaymentSuccess      = lazy(() => import("./pages/PaymentSuccess"));
const QBOHealth           = lazy(() => import("./pages/QBOHealth"));
const RiskCompliance      = lazy(() => import("./pages/RiskCompliance"));
const MonthlyReconciliation = lazy(() => import("./pages/MonthlyReconciliation"));
const Notifications       = lazy(() => import("./pages/Notifications"));
const ClientUpdateForm    = lazy(() => import("./pages/ClientUpdateForm"));
const TripPublishManager  = lazy(() => import("./pages/TripPublishManager"));
const FlightSearch        = lazy(() => import("./pages/FlightSearch"));
const HotelSearch         = lazy(() => import("./pages/HotelSearch"));
const CruiseSearch        = lazy(() => import("./pages/CruiseSearch"));
const TripInsurance       = lazy(() => import("./pages/TripInsurance"));
const FeaturedTrips       = lazy(() => import("./pages/FeaturedTrips"));
const LoanApplications   = lazy(() => import("./pages/LoanApplications"));

// ─── Lazy-loaded Client Portal Pages ─────────────────────────────────────────
const PortalLogin         = lazy(() => import("./pages/client/PortalLogin"));
const PortalDashboard     = lazy(() => import("./pages/client/PortalDashboard"));
const PortalTrips         = lazy(() => import("./pages/client/PortalTrips"));
const PortalTripDetail    = lazy(() => import("./pages/client/PortalTripDetail"));
const PortalMessages      = lazy(() => import("./pages/client/PortalMessages"));
const PortalInvoices      = lazy(() => import("./pages/client/PortalInvoices"));
const PortalInvoiceDetail = lazy(() => import("./pages/client/PortalInvoiceDetail"));
const PortalPayments      = lazy(() => import("./pages/client/PortalPayments"));

// ─── QueryClient Configuration ───────────────────────────────────────────────
// FIX: Previously used `new QueryClient()` with no options, meaning:
//   - staleTime = 0  → every component mount triggered a Supabase refetch
//   - refetchOnWindowFocus = true → switching tabs hammered the DB
// Now data stays fresh for 5 min and won't refetch on tab focus.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,     // Data is fresh for 5 minutes
      gcTime: 1000 * 60 * 10,       // Keep unused cache for 10 minutes
      retry: 1,                      // Only retry once on failure (was 3)
      refetchOnWindowFocus: false,   // Stop refetching when tab regains focus
      refetchOnReconnect: true,      // Still refresh after network loss
    },
  },
});

// ─── Loading Fallback ─────────────────────────────────────────────────────────
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen text-muted-foreground text-sm">
    Loading...
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <PortalAuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            {/* Suspense wraps all routes so lazy-loaded pages show a fallback */}
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Agent Dashboard Routes */}
                <Route path="/auth" element={<Auth />} />
                <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/contacts" element={<ProtectedRoute><CRM /></ProtectedRoute>} />
                <Route path="/contacts/:clientId" element={<ProtectedRoute><ClientDetail /></ProtectedRoute>} />
                <Route path="/bookings" element={<ProtectedRoute><Bookings /></ProtectedRoute>} />
                <Route path="/bookings/:bookingId" element={<ProtectedRoute><BookingDetail /></ProtectedRoute>} />
                <Route path="/training" element={<ProtectedRoute><Training /></ProtectedRoute>} />
                <Route path="/commissions" element={<ProtectedRoute><Commissions /></ProtectedRoute>} />
                <Route path="/commission-report" element={<ProtectedRoute><CommissionReport /></ProtectedRoute>} />
                <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
                <Route path="/branding" element={<ProtectedRoute><Branding /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/qbo-health" element={<ProtectedRoute><QBOHealth /></ProtectedRoute>} />
                <Route path="/risk-compliance" element={<ProtectedRoute><RiskCompliance /></ProtectedRoute>} />
                <Route path="/reconciliation" element={<ProtectedRoute><MonthlyReconciliation /></ProtectedRoute>} />
                <Route path="/team" element={<ProtectedRoute><TeamManagement /></ProtectedRoute>} />
                <Route path="/suppliers" element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />
                <Route path="/trips" element={<ProtectedRoute><Trips /></ProtectedRoute>} />
                <Route path="/trips/:tripId" element={<ProtectedRoute><TripDetail /></ProtectedRoute>} />
                <Route path="/trips/:tripId/itinerary" element={<ProtectedRoute><ItineraryBuilder /></ProtectedRoute>} />
                <Route path="/trips/:tripId/insurance" element={<ProtectedRoute><TripInsurance /></ProtectedRoute>} />
                <Route path="/trips/:tripId/landing-page" element={<ProtectedRoute><GroupLandingBuilder /></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                <Route path="/publish-manager" element={<ProtectedRoute><TripPublishManager /></ProtectedRoute>} />
                <Route path="/flights" element={<ProtectedRoute><FlightSearch /></ProtectedRoute>} />
                <Route path="/hotels" element={<ProtectedRoute><HotelSearch /></ProtectedRoute>} />
                <Route path="/cruises" element={<ProtectedRoute><CruiseSearch /></ProtectedRoute>} />
                <Route path="/featured-trips" element={<ProtectedRoute><FeaturedTrips /></ProtectedRoute>} />
                <Route path="/loan-applications" element={<ProtectedRoute><LoanApplications /></ProtectedRoute>} />
                <Route path="/supplier-docs" element={<SupplierDocs />} />
                <Route path="/shared/:token" element={<SharedTrip />} />
                <Route path="/group/:token" element={<GroupLanding />} />
                <Route path="/authorize/:token" element={<CCAuthorize />} />
                <Route path="/payment-success" element={<PaymentSuccess />} />
                <Route path="/update-info/:token" element={<ClientUpdateForm />} />

                {/* Client Portal Routes */}
                <Route path="/client/login" element={<PortalLogin />} />
                <Route path="/client/verify" element={<PortalLogin />} />
                <Route path="/client" element={<PortalProtectedRoute><PortalLayout /></PortalProtectedRoute>}>
                  <Route index element={<PortalDashboard />} />
                  <Route path="trips" element={<PortalTrips />} />
                  <Route path="trips/:tripId" element={<PortalTripDetail />} />
                  <Route path="payments" element={<PortalPayments />} />
                  <Route path="messages" element={<PortalMessages />} />
                  <Route path="invoices" element={<PortalInvoices />} />
                  <Route path="invoices/:invoiceId" element={<PortalInvoiceDetail />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </PortalAuthProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
