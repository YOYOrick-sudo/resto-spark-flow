import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Loader2 } from "lucide-react";

export function AdminRouteGuard() {
  const { session, isLoading: authLoading } = useAuth();
  const { isAdmin, needsMFA, isLoading } = useAdminAuth();
  const location = useLocation();

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const isOnMfaSetup = location.pathname === "/nesto-admin/mfa-setup";

  if (needsMFA && !isOnMfaSetup) {
    return <Navigate to="/nesto-admin/mfa-setup" replace />;
  }

  // Already on MFA setup OR MFA satisfied → render children
  return <Outlet />;
}
