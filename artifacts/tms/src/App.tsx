import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Parcels from "@/pages/parcels";
import ParcelNew from "@/pages/parcel-new";
import ParcelDetail from "@/pages/parcel-detail";
import ScanPage from "@/pages/scan";
import Hubs from "@/pages/hubs";
import Staff from "@/pages/staff";
import Complaints from "@/pages/complaints";
import Reports from "@/pages/reports";
import SearchPage from "@/pages/search";
import AuditLogs from "@/pages/audit";
import { AppLayout } from "@/components/layout";
import { useEffect } from "react";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    </div>
  );
  if (!user) return null;

  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        <ProtectedRoute component={() => {
          const [, setLocation] = useLocation();
          useEffect(() => setLocation("/dashboard"), [setLocation]);
          return null;
        }} />
      </Route>
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/parcels/new" component={() => <ProtectedRoute component={ParcelNew} />} />
      <Route path="/parcels/:id" component={() => <ProtectedRoute component={ParcelDetail} />} />
      <Route path="/parcels" component={() => <ProtectedRoute component={Parcels} />} />
      <Route path="/scan" component={() => <ProtectedRoute component={ScanPage} />} />
      <Route path="/hubs" component={() => <ProtectedRoute component={Hubs} />} />
      <Route path="/staff" component={() => <ProtectedRoute component={Staff} />} />
      <Route path="/complaints" component={() => <ProtectedRoute component={Complaints} />} />
      <Route path="/reports" component={() => <ProtectedRoute component={Reports} />} />
      <Route path="/search" component={() => <ProtectedRoute component={SearchPage} />} />
      <Route path="/audit" component={() => <ProtectedRoute component={AuditLogs} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
