import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Loader2 } from "lucide-react";

export function AdminRouteGuard() {
  const { session, isLoading: authLoading } = useAuth();
  const { isAdmin, needsMFA, isLoading } = useAdminAuth();

  console.log("[AdminRouteGuard] render →", {
    hasSession: !!session,
    userId: session?.user?.id,
    authLoading,
    isAdmin,
    needsMFA,
    isLoading,
    pathname: window.location.pathname,
  });

  if (authLoading || isLoading) {
    console.log("[AdminRouteGuard] → showing loader");
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!session) {
    console.log("[AdminRouteGuard] → redirect /auth (no session)");
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    console.log("[AdminRouteGuard] → redirect / (not admin)");
    return <Navigate to="/" replace />;
  }

  if (needsMFA) {
    console.log("[AdminRouteGuard] → redirect /nesto-admin/mfa-setup (needs MFA)");
    return <Navigate to="/nesto-admin/mfa-setup" replace />;
  }

  console.log("[AdminRouteGuard] → render Outlet (admin OK)");
  return <Outlet />;
}
