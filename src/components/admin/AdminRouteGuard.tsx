import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Loader2 } from "lucide-react";

export function AdminRouteGuard() {
  const { session, loading: authLoading } = useAuth();
  const { isAdmin, needsMFA, isLoading } = useAdminAuth();

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  // Not logged in
  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  // Not admin
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Admin but needs MFA
  if (needsMFA) {
    return <Navigate to="/nesto-admin/mfa-setup" replace />;
  }

  return <Outlet />;
}
