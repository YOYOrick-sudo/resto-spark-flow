import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface AdminAuthState {
  isAdmin: boolean;
  needsMFA: boolean;
  isLoading: boolean;
}

export function useAdminAuth(): AdminAuthState {
  const { session, isLoading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [needsMFA, setNeedsMFA] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Wait for auth to settle
    if (authLoading) {
      setIsLoading(true);
      return;
    }

    if (!session?.user) {
      setIsAdmin(false);
      setNeedsMFA(false);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    async function check() {
      try {
        // 1. Check platform_admin role via RPC
        const { data: adminCheck, error } = await supabase.rpc("is_platform_admin", {
          _user_id: session.user.id,
        });

        if (error || !adminCheck) {
          if (!cancelled) {
            setIsAdmin(false);
            setNeedsMFA(false);
          }
          return;
        }

        if (!cancelled) setIsAdmin(true);

        // 2. Check MFA factors (more reliable than AAL alone)
        const { data: factorsData, error: factorsError } =
          await supabase.auth.mfa.listFactors();

        if (factorsError) {
          if (!cancelled) setNeedsMFA(true);
          return;
        }

        const verifiedFactors = factorsData?.totp?.filter((f) => f.status === "verified") ?? [];

        if (verifiedFactors.length === 0) {
          // No verified TOTP factor → user must enroll
          if (!cancelled) setNeedsMFA(true);
          return;
        }

        // 3. Has verified factor — check current AAL
        const { data: aalData, error: aalError } =
          await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

        if (!cancelled) {
          if (aalError) {
            setNeedsMFA(true);
          } else if (aalData.currentLevel !== "aal2") {
            // Has factor but session not elevated → needs verification
            setNeedsMFA(true);
          } else {
            setNeedsMFA(false);
          }
        }
      } catch (err) {
        console.error("[useAdminAuth] check failed:", err);
        if (!cancelled) {
          setIsAdmin(false);
          setNeedsMFA(false);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    check();
    return () => {
      cancelled = true;
    };
    // access_token wijzigt bij AAL-upgrade na MFA-verify → triggert re-check
  }, [session?.user?.id, session?.access_token, authLoading]);

  return { isAdmin, needsMFA, isLoading };
}
