import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Edge function: confirm-goods-receipt
 * Roept RPC public.confirm_goods_receipt aan en stuurt broadcast pakbon:{location_id}.
 */

export type AfwijkingStatus =
  | "akkoord"
  | "afwijking_missing"
  | "afwijking_beschadigd"
  | "afwijking_verkeerd"
  | "afwijking_meer";

export interface ConfirmLineInput {
  line_id: string;
  status: AfwijkingStatus;
  hoeveelheid_ontvangen?: number;
  lotnummer?: string;
  tht_datum?: string;
  afwijking_notitie?: string;
  /** Bij beschadigd/verkeerd: chef accepteert toch → voorraad IN + credit-note. */
  accepted_with_issue?: boolean;
}

export interface ConfirmGoodsReceiptInput {
  receipt_id: string;
  lines: ConfirmLineInput[];
  temp_gekoeld?: number | null;
  temp_vries?: number | null;
  temp_skip?: { gekoeld?: string; vries?: string };
}

export interface ConfirmGoodsReceiptResult {
  ok: boolean;
  summary: {
    receipt_id: string;
    location_id: string;
    new_status: string;
    count_akkoord: number;
    count_afwijking: number;
    voorraad_movements: number;
    credit_notes_created: number;
    temp_registrations: number;
    checklist_run_id: string;
    has_strict_temp_alarm: boolean;
    warnings: Array<{ code: string; message: string; threshold?: number }>;
  };
}

export type ConfirmErrorCode =
  | "unauthorized"
  | "forbidden"
  | "validation_error"
  | "receipt_not_found"
  | "already_confirmed"
  | "internal_error"
  | "network_error";

export interface ConfirmError {
  code: ConfirmErrorCode;
  message: string;
  status?: number;
  details?: unknown;
}

export function useConfirmGoodsReceipt() {
  const qc = useQueryClient();

  return useMutation<ConfirmGoodsReceiptResult, ConfirmError, ConfirmGoodsReceiptInput>({
    mutationFn: async (input) => {
      const { data, error } = await supabase.functions.invoke<ConfirmGoodsReceiptResult>(
        "confirm-goods-receipt",
        { body: input },
      );

      if (error) {
        // FunctionsHttpError exposes context with response body
        const ctx = (error as unknown as { context?: Response }).context;
        let payload: { error?: ConfirmErrorCode; message?: string; details?: unknown } = {};
        let status = 0;
        if (ctx) {
          status = ctx.status;
          try {
            payload = await ctx.json();
          } catch {
            // ignore
          }
        }
        const code: ConfirmErrorCode = payload.error ?? "internal_error";
        throw {
          code,
          status,
          message: payload.message ?? error.message ?? "Onbekende fout",
          details: payload.details,
        } as ConfirmError;
      }

      if (!data || !data.ok) {
        throw {
          code: "internal_error",
          message: "Lege response van server",
        } as ConfirmError;
      }

      return data;
    },
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: ["goods-receipt-detail", vars.receipt_id] });
      qc.invalidateQueries({ queryKey: ["goods-receipts"] });
    },
  });
}
