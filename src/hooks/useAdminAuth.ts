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
        console.log("[useAdminAuth] START check for user:", session.user.id, session.user.email);

        // 1. Check platform_admin role via RPC
        const { data: adminCheck, error } = await supabase.rpc("is_platform_admin", {
          _user_id: session.user.id,
        });
        console.log("[useAdminAuth] is_platform_admin RPC →", { adminCheck, error });

        if (error || !adminCheck) {
          console.warn("[useAdminAuth] NOT admin → setting isAdmin=false");
          if (!cancelled) {
            setIsAdmin(false);
            setNeedsMFA(false);
          }
          return;
        }

        if (!cancelled) setIsAdmin(true);
        console.log("[useAdminAuth] isAdmin=true, now checking MFA…");

        // 2. Check MFA assurance level
        const { data: aalData, error: aalError } =
          await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        console.log("[useAdminAuth] AAL →", { aalData, aalError });

        // 3. Also check listFactors as fallback diagnostic
        const { data: factorsData, error: factorsError } =
          await supabase.auth.mfa.listFactors();
        console.log("[useAdminAuth] listFactors →", { factorsData, factorsError });

        if (!cancelled) {
          if (aalError) {
            console.warn("[useAdminAuth] AAL error → needsMFA=true");
            setNeedsMFA(true);
          } else {
            const currentLevel = aalData.currentLevel;
            const nextLevel = aalData.nextLevel;
            console.log("[useAdminAuth] levels:", { currentLevel, nextLevel });

            if (nextLevel === "aal2" && currentLevel !== "aal2") {
              console.log("[useAdminAuth] → MFA enrolled, not verified this session");
              setNeedsMFA(true);
            } else if (nextLevel === "aal1") {
              console.log("[useAdminAuth] → no factors, needs enrollment");
              setNeedsMFA(true);
            } else {
              console.log("[useAdminAuth] → AAL2 verified, no MFA needed");
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
