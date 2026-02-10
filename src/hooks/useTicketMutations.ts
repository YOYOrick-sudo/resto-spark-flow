import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "sonner";

export function useCreateTicket(locationId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, any> & { location_id: string; name: string; display_title: string }) => {
      // Get next sort order
      const { data: sortOrder } = await supabase.rpc("get_next_ticket_sort_order", {
        _location_id: input.location_id,
      });
      const { data, error } = await supabase
        .from("tickets")
        .insert({ ...input, sort_order: sortOrder ?? 10 } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Ticket aangemaakt");
      if (locationId) qc.invalidateQueries({ queryKey: queryKeys.tickets(locationId) });
    },
    onError: (err: any) => {
      toast.error(err.message || "Fout bij aanmaken ticket");
    },
  });
}

export function useUpdateTicket(locationId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, any> & { id: string }) => {
      const { id, ...rest } = input;
      const { data, error } = await supabase
        .from("tickets")
        .update(rest as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Ticket bijgewerkt");
      if (locationId) qc.invalidateQueries({ queryKey: queryKeys.tickets(locationId) });
    },
    onError: (err: any) => {
      toast.error(err.message || "Fout bij bijwerken ticket");
    },
  });
}

export function useArchiveTicket(locationId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ticketId: string) => {
      const { error } = await supabase
        .from("tickets")
        .update({ status: "archived" })
        .eq("id", ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ticket gearchiveerd");
      if (locationId) qc.invalidateQueries({ queryKey: queryKeys.tickets(locationId) });
    },
    onError: (err: any) => {
      toast.error(err.message || "Fout bij archiveren");
    },
  });
}

export function useRestoreTicket(locationId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ticketId: string) => {
      const { error } = await supabase
        .from("tickets")
        .update({ status: "draft" })
        .eq("id", ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ticket hersteld als draft");
      if (locationId) qc.invalidateQueries({ queryKey: queryKeys.tickets(locationId) });
    },
    onError: (err: any) => {
      toast.error(err.message || "Fout bij herstellen");
    },
  });
}

export function useDuplicateTicket(locationId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ticketId: string) => {
      // Read original
      const { data: original, error: readErr } = await supabase
        .from("tickets")
        .select("*")
        .eq("id", ticketId)
        .single();
      if (readErr || !original) throw readErr || new Error("Ticket niet gevonden");

      const { data: sortOrder } = await supabase.rpc("get_next_ticket_sort_order", {
        _location_id: original.location_id,
      });

      const { data, error } = await supabase
        .from("tickets")
        .insert({
          location_id: original.location_id,
          policy_set_id: original.policy_set_id,
          name: original.name + " (kopie)",
          display_title: original.display_title + " (kopie)",
          description: original.description,
          short_description: original.short_description,
          color: original.color,
          ticket_type: original.ticket_type === "default" ? "regular" : original.ticket_type,
          is_default: false,
          status: "draft",
          min_party_size: original.min_party_size,
          max_party_size: original.max_party_size,
          duration_minutes: original.duration_minutes,
          buffer_minutes: original.buffer_minutes,
          sort_order: sortOrder ?? 10,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Ticket gedupliceerd");
      if (locationId) qc.invalidateQueries({ queryKey: queryKeys.tickets(locationId) });
    },
    onError: (err: any) => {
      toast.error(err.message || "Fout bij dupliceren");
    },
  });
}
