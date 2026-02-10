import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queryKeys";
import type { Ticket, PaymentType } from "@/types/tickets";

export interface TicketWithMeta extends Ticket {
  shiftCount: number;
  policyInfo: { payment_type: PaymentType; payment_amount_cents: number | null } | null;
}

export function useTickets(locationId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tickets(locationId!),
    enabled: !!locationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("*, policy_sets(payment_type, payment_amount_cents), shift_tickets(id)")
        .eq("location_id", locationId!)
        .order("sort_order", { ascending: true });

      if (error) throw error;

      const tickets: TicketWithMeta[] = (data ?? []).map((t: any) => ({
        ...t,
        policy_sets: undefined,
        shift_tickets: undefined,
        shiftCount: t.shift_tickets?.length ?? 0,
        policyInfo: t.policy_sets
          ? { payment_type: t.policy_sets.payment_type, payment_amount_cents: t.policy_sets.payment_amount_cents }
          : null,
      }));

      return {
        visibleTickets: tickets.filter(t => t.status === "active" || t.status === "draft"),
        archivedTickets: tickets.filter(t => t.status === "archived"),
      };
    },
  });
}
