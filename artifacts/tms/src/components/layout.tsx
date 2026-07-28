import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Package, LayoutDashboard, Search, Users, MapPin, AlertCircle, FileText, Activity, LogOut, Plus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWA } from "@/hooks/use-pwa";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useEffect } from "react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const { isInstallable, installApp } = usePWA();
  const { toast } = useToast();

  useEffect(() => {
    if (isInstallable) {
      toast({
        title: "Install TMS App",
        description: "Add to home screen for offline access and a faster, native experience.",
        action: (
          <ToastAction altText="Install" onClick={installApp} className="bg-primary text-primary-foreground hover:bg-primary/90">
            Install
          </ToastAction>
        ),
        duration: 10000,
      });
    }
  }, [isInstallable, installApp, toast]);

  if (!user) return <div className="p-8">Loading...</div>;

  const isSuperAdmin = user.role === "SUPER_ADMIN";

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/parcels", label: "Parcels", icon: Package },
    { href: "/parcels/new", label: "New Booking", icon: Plus },
    { href: "/search", label: "Search", icon: Search },
    { href: "/complaints", label: "Complaints", icon: AlertCircle },
  ];

  if (isSuperAdmin) {
    navItems.push(
      { href: "/hubs", label: "Hubs", icon: MapPin },
      { href: "/staff", label: "Staff", icon: Users },
      { href: "/reports", label: "Reports", icon: FileText },
      { href: "/audit", label: "Audit", icon: Activity }
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-muted/20">
      <aside className="hidden md:flex w-64 flex-col bg-background border-r">
        <div className="p-4 border-b h-16 flex items-center">
          <h1 className="font-bold text-xl text-primary">TMS</h1>
          <span className="ml-auto text-xs bg-muted px-2 py-1 rounded">ADMIN</span>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <span className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer ${active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted"}`}>
                  <Icon className="w-5 h-5" />
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
        {isInstallable && (
          <div className="p-4 border-t bg-primary/5">
            <div className="bg-background rounded-lg border p-3 shadow-sm">
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1">
                <Download className="w-3.5 h-3.5 text-primary animate-bounce" />
                TMS App Available
              </h4>
              <p className="text-[11px] text-muted-foreground mb-2.5">
                Install for offline support and desktop shortcut.
              </p>
              <Button size="sm" className="w-full text-xs h-8" onClick={installApp}>
                Install Web App
              </Button>
            </div>
          </div>
        )}
        <div className="p-4 border-t">
          <div className="mb-4">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          <Button variant="outline" className="w-full justify-start" onClick={logout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t flex justify-around p-2 z-50">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const active = location.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}>
              <span className={`flex flex-col items-center p-2 rounded-md ${active ? "text-primary" : "text-muted-foreground"}`}>
                <Icon className="w-5 h-5" />
                <span className="text-[10px] mt-1">{item.label}</span>
              </span>
            </Link>
          );
        })}
      </div>

      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
