import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface AdminAuthState {
  isAdmin: boolean;
  needsMFA: boolean;
  isLoading: boolean;
}

export function useAdminAuth(): AdminAuthState {
  const { session } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [needsMFA, setNeedsMFA] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) {
      setIsAdmin(false);
      setNeedsMFA(false);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

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

        // 2. Check MFA assurance level
        const { data: aalData, error: aalError } =
          await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

        if (!cancelled) {
          if (aalError) {
            // If MFA check fails, require enrollment
            setNeedsMFA(true);
          } else {
            // Admin needs AAL2 (MFA verified)
            const currentLevel = aalData.currentLevel;
            const nextLevel = aalData.nextLevel;

            if (nextLevel === "aal2" && currentLevel !== "aal2") {
              // User has MFA enrolled but hasn't verified this session
              setNeedsMFA(true);
            } else if (nextLevel === "aal1") {
              // No MFA factors enrolled → needs enrollment
              setNeedsMFA(true);
            } else {
              // AAL2 verified
              setNeedsMFA(false);
            }
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
  }, [session?.user?.id]);

  return { isAdmin, needsMFA, isLoading };
}
