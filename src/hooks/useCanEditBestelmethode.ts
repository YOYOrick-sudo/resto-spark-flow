import { useUserContext } from "@/contexts/UserContext";

/**
 * Bepaalt of de huidige gebruiker de bestelmethode mag wijzigen.
 *
 * Reglement (afgedwongen door database-trigger guard_bestelling_methode_change /
 * guard_leverancier_methode_change):
 *  - owner / manager / finance: MAG wijzigen
 *  - kitchen / service / overige rollen: MAG NIET wijzigen
 *  - platform-admin: MAG altijd
 *
 * Frontend gebruikt deze hook puur voor UI-feedback (disabled + tooltip).
 * De échte beveiliging staat in de DB-trigger.
 */
export function useCanEditBestelmethode(): {
  canEdit: boolean;
  reason: string | null;
} {
  const { context } = useUserContext();

  if (!context) {
    return { canEdit: false, reason: "Geen gebruiker-context" };
  }
  if (context.is_platform_admin) {
    return { canEdit: true, reason: null };
  }

  const role = (context as any).role as string | undefined;
  const allowed = ["owner", "manager", "finance"];
  if (role && allowed.includes(role)) {
    return { canEdit: true, reason: null };
  }
  return {
    canEdit: false,
    reason: "Alleen eigenaars, managers en finance-medewerkers mogen de bestelmethode wijzigen",
  };
}
