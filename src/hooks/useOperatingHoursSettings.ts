import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type OperatingExceptionType = "closed" | "modified" | "extra";

export interface RegularHourSlot {
  id: string;
  location_id: string;
  day_of_week: number; // 1=Mon..7=Sun
  service_type: string;
  open_time: string; // "HH:MM:SS"
  close_time: string;
  sort_order: number;
}

export interface OperatingException {
  id: string;
  location_id: string;
  exception_date: string; // YYYY-MM-DD
  service_type: string;
  exception_type: OperatingExceptionType;
  open_time: string | null;
  close_time: string | null;
  label: string | null;
  source: string;
  created_at: string;
}

const SERVICE = "general";

// ============ Regular Hours ============

const regularKey = (locationId: string) =>
  ["operating-hours-settings", "regular", locationId, SERVICE] as const;

export function useRegularHours(locationId: string | undefined) {
  return useQuery({
    queryKey: regularKey(locationId ?? ""),
    enabled: !!locationId,
    staleTime: 30_000,
    queryFn: async (): Promise<RegularHourSlot[]> => {
      const { data, error } = await supabase
        .from("location_operating_hours")
        .select("*")
        .eq("location_id", locationId!)
        .eq("service_type", SERVICE)
        .order("day_of_week", { ascending: true })
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as RegularHourSlot[];
    },
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>, locationId: string) {
  qc.invalidateQueries({ queryKey: ["operating-hours-settings"], exact: false });
  qc.invalidateQueries({ queryKey: ["operating-hours", locationId], exact: false });
  qc.invalidateQueries({ queryKey: ["operating-hours-day", locationId], exact: false });
}

/**
 * Upserts a single hour slot for a given day. Ensures only one slot per day
 * by patching an existing record (lowest sort_order) or inserting a new one.
 * Idempotent — safe against double-clicks / race conditions.
 */
export function useUpsertDayHours(locationId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      day_of_week: number;
      open_time: string;
      close_time: string;
    }) => {
      if (!locationId) throw new Error("No location");

      const { data: existing, error: fetchErr } = await supabase
        .from("location_operating_hours")
        .select("id")
        .eq("location_id", locationId)
        .eq("service_type", SERVICE)
        .eq("day_of_week", input.day_of_week)
        .order("sort_order", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (fetchErr) throw fetchErr;

      if (existing) {
        const { data, error } = await supabase
          .from("location_operating_hours")
          .update({ open_time: input.open_time, close_time: input.close_time })
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        return data as RegularHourSlot;
      }

      const { data, error } = await supabase
        .from("location_operating_hours")
        .insert({
          location_id: locationId,
          service_type: SERVICE,
          day_of_week: input.day_of_week,
          open_time: input.open_time,
          close_time: input.close_time,
          sort_order: 0,
        })
        .select()
        .single();
      if (error) throw error;
      return data as RegularHourSlot;
    },
    onSuccess: () => locationId && invalidateAll(qc, locationId),
  });
}

/** @deprecated Use useUpsertDayHours instead. Retained for backwards compat. */
export function useInsertHourSlot(locationId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      day_of_week: number;
      open_time: string;
      close_time: string;
      sort_order?: number;
    }) => {
      if (!locationId) throw new Error("No location");
      const { data, error } = await supabase
        .from("location_operating_hours")
        .insert({
          location_id: locationId,
          service_type: SERVICE,
          day_of_week: input.day_of_week,
          open_time: input.open_time,
          close_time: input.close_time,
          sort_order: input.sort_order ?? 0,
        })
        .select()
        .single();
      if (error) throw error;
      return data as RegularHourSlot;
    },
    onSuccess: () => locationId && invalidateAll(qc, locationId),
  });
}

export function useUpdateHourSlot(locationId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      open_time?: string;
      close_time?: string;
      sort_order?: number;
    }) => {
      const { id, ...patch } = input;
      const { data, error } = await supabase
        .from("location_operating_hours")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as RegularHourSlot;
    },
    // Optimistic update
    onMutate: async (input) => {
      if (!locationId) return;
      await qc.cancelQueries({ queryKey: regularKey(locationId) });
      const prev = qc.getQueryData<RegularHourSlot[]>(regularKey(locationId));
      if (prev) {
        qc.setQueryData<RegularHourSlot[]>(
          regularKey(locationId),
          prev.map((s) => (s.id === input.id ? { ...s, ...input } : s))
        );
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (locationId && ctx?.prev) qc.setQueryData(regularKey(locationId), ctx.prev);
    },
    onSettled: () => locationId && invalidateAll(qc, locationId),
  });
}

export function useDeleteHourSlot(locationId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("location_operating_hours")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => locationId && invalidateAll(qc, locationId),
  });
}

// ============ Exceptions ============

const exceptionsKey = (locationId: string) =>
  ["operating-hours-settings", "exceptions", locationId] as const;

export function useExceptions(locationId: string | undefined) {
  return useQuery({
    queryKey: exceptionsKey(locationId ?? ""),
    enabled: !!locationId,
    staleTime: 30_000,
    queryFn: async (): Promise<OperatingException[]> => {
      const today = new Date();
      const from = new Date(today);
      from.setDate(today.getDate() - 30);
      const to = new Date(today);
      to.setDate(today.getDate() + 365);

      const fmt = (d: Date) => d.toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from("location_operating_exceptions")
        .select("*")
        .eq("location_id", locationId!)
        .gte("exception_date", fmt(from))
        .lte("exception_date", fmt(to))
        .order("exception_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as OperatingException[];
    },
  });
}

export function useUpsertException(locationId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      exception_date: string;
      exception_type: OperatingExceptionType;
      open_time?: string | null;
      close_time?: string | null;
      label?: string | null;
    }) => {
      if (!locationId) throw new Error("No location");
      const payload = {
        location_id: locationId,
        service_type: SERVICE,
        exception_date: input.exception_date,
        exception_type: input.exception_type,
        open_time: input.exception_type === "closed" ? null : input.open_time ?? null,
        close_time: input.exception_type === "closed" ? null : input.close_time ?? null,
        label: input.label ?? null,
        source: "manual",
      };
      if (input.id) {
        const { data, error } = await supabase
          .from("location_operating_exceptions")
          .update(payload)
          .eq("id", input.id)
          .select()
          .single();
        if (error) throw error;
        return data as OperatingException;
      } else {
        const { data, error } = await supabase
          .from("location_operating_exceptions")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return data as OperatingException;
      }
    },
    onSuccess: () => locationId && invalidateAll(qc, locationId),
  });
}

export function useDeleteException(locationId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("location_operating_exceptions")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => locationId && invalidateAll(qc, locationId),
  });
}

/**
 * Bulk-insert exceptions (used by the holiday template import).
 * Caller should filter out dates that already exist before calling.
 */
export function useBulkInsertExceptions(locationId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      items: Array<{
        exception_date: string;
        exception_type: OperatingExceptionType;
        open_time?: string | null;
        close_time?: string | null;
        label?: string | null;
      }>
    ) => {
      if (!locationId) throw new Error("No location");
      if (items.length === 0) return [];
      const payloads = items.map((i) => ({
        location_id: locationId,
        service_type: SERVICE,
        exception_date: i.exception_date,
        exception_type: i.exception_type,
        open_time: i.exception_type === "closed" ? null : i.open_time ?? null,
        close_time: i.exception_type === "closed" ? null : i.close_time ?? null,
        label: i.label ?? null,
        source: "holiday_template",
      }));
      const { data, error } = await supabase
        .from("location_operating_exceptions")
        .insert(payloads)
        .select();
      if (error) throw error;
      return (data ?? []) as OperatingException[];
    },
    onSuccess: () => locationId && invalidateAll(qc, locationId),
  });
}

// ============ Helpers ============

export const DAY_LABELS: Record<number, string> = {
  1: "Maandag",
  2: "Dinsdag",
  3: "Woensdag",
  4: "Donderdag",
  5: "Vrijdag",
  6: "Zaterdag",
  7: "Zondag",
};

export function toTimeInput(value: string | null | undefined): string {
  if (!value) return "";
  // "HH:MM:SS" -> "HH:MM"
  return value.length >= 5 ? value.slice(0, 5) : value;
}

export function toTimeDb(value: string): string {
  // "HH:MM" -> "HH:MM:00"
  if (!value) return value;
  return value.length === 5 ? `${value}:00` : value;
}
