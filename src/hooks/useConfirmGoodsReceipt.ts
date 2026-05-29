import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Edge function: confirm-goods-receipt
 * Loop 4: regel-input ondersteunt accept_ai_factor, manual_factor en werkelijk_gewicht_g.
 * Foutcode `factor_required` (HTTP 422) bevat per-regel `details.lines[]`.
 */

export type AfwijkingStatus =
  | "akkoord"
  | "afwijking_missing"
  | "afwijking_beschadigd"
  | "afwijking_verkeerd"
  | "afwijking_meer";

export interface ManualFactorInput {
  hoeveelheid: number;
  eenheid: string;
}

export interface ConfirmLineInput {
  line_id: string;
  status: AfwijkingStatus;
  hoeveelheid_ontvangen?: number;
  lotnummer?: string;
  tht_datum?: string;
  afwijking_notitie?: string;
  /** Bij beschadigd/verkeerd: chef accepteert toch → voorraad IN + credit-note. */
  accepted_with_issue?: boolean;
  /** Loop 4: chef bevestigt AI-suggestie (graduate count → ai_confirmed) */
  accept_ai_factor?: boolean;
  /** Loop 4: chef vult eigen factor in (override → factor_source='user') */
  manual_factor?: ManualFactorInput;
  /** Loop 4: variabel gewicht per verpakking in gram */
  werkelijk_gewicht_g?: number;
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
  | "factor_required"
  | "needs_confirmation_required"
  | "unit_mismatch"
  | "internal_error"
  | "network_error";

export interface FactorRequiredLineDetail {
  line_id: string;
  reason: string;
  product?: string;
}

export interface ConfirmError {
  code: ConfirmErrorCode;
  message: string;
  status?: number;
  details?: { lines?: FactorRequiredLineDetail[] } & Record<string, unknown>;
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
          details: payload.details as ConfirmError["details"],
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
