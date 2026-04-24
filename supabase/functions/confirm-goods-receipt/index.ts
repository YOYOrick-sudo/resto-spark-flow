// Edge Function: confirm-goods-receipt
// Roept de RPC public.confirm_goods_receipt aan in één transactie en
// emit een Realtime broadcast op pakbon:{location_id}.
//
// verify_jwt = true (default in supabase/config.toml). We valideren de JWT
// in code via getClaims() en geven het user-id door aan de RPC. De RPC
// doet zelf de role-check en faalt met 'forbidden' als de user geen
// owner/manager/kitchen-rol heeft op de locatie.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ----- Validatie -----
const LineSchema = z.object({
  line_id: z.string().uuid(),
  status: z.enum([
    "akkoord",
    "afwijking_missing",
    "afwijking_beschadigd",
    "afwijking_verkeerd",
    "afwijking_meer",
  ]),
  hoeveelheid_ontvangen: z.number().nonnegative().optional(),
  lotnummer: z.string().max(100).optional(),
  tht_datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  afwijking_notitie: z.string().max(2000).optional(),
  afwijking_foto_url: z.string().url().max(2000).optional(),
});

const TempSkipSchema = z
  .object({
    gekoeld: z.string().min(1).max(200).optional(),
    vries: z.string().min(1).max(200).optional(),
  })
  .optional()
  .default({});

const BodySchema = z.object({
  receipt_id: z.string().uuid(),
  lines: z.array(LineSchema).min(1).max(200),
  temp_gekoeld: z.number().min(-30).max(50).optional().nullable(),
  temp_vries: z.number().min(-50).max(20).optional().nullable(),
  temp_skip: TempSkipSchema,
});

type ErrorCode =
  | "unauthorized"
  | "validation_error"
  | "forbidden"
  | "receipt_not_found"
  | "already_confirmed"
  | "internal_error";

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(code: ErrorCode, message: string, status: number, details?: unknown) {
  return jsonResponse(status, { error: code, message, details });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return errorResponse("validation_error", "Method not allowed", 405);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // ----- 1. Auth -----
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return errorResponse("unauthorized", "Missing bearer token", 401);
  }

  const token = authHeader.replace("Bearer ", "");
  let userId: string;

  // Smoke-test bypass: als bearer == service_role key, sla auth-check over
  // en lees user_id uit de request body. Dit is bedoeld voor verify-script
  // testing en is alleen mogelijk omdat de service_role key nooit naar de
  // browser lekt.
  const isServiceRoleBypass = token === SUPABASE_SERVICE_ROLE_KEY;

  if (!isServiceRoleBypass) {
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data, error } = await supabaseAuth.auth.getClaims(token);
    if (error || !data?.claims?.sub) {
      return errorResponse("unauthorized", "Invalid or expired token", 401);
    }
    userId = data.claims.sub;
  } else {
    userId = ""; // gevuld vanuit body hieronder
  }

  // ----- 2. Body validatie -----
  let bodyJson: unknown;
  try {
    bodyJson = await req.json();
  } catch {
    return errorResponse("validation_error", "Invalid JSON body", 400);
  }

  // Voor service-role-bypass: accepteer een _smoke_user_id field
  if (isServiceRoleBypass && typeof bodyJson === "object" && bodyJson !== null) {
    const smokeUid = (bodyJson as Record<string, unknown>)._smoke_user_id;
    if (typeof smokeUid !== "string" || !smokeUid) {
      return errorResponse(
        "validation_error",
        "Service-role bypass requires _smoke_user_id in body",
        400,
      );
    }
    userId = smokeUid;
  }

  const parsed = BodySchema.safeParse(bodyJson);
  if (!parsed.success) {
    return errorResponse(
      "validation_error",
      "Body failed validation",
      400,
      parsed.error.flatten(),
    );
  }
  const body = parsed.data;

  // ----- 3. RPC call -----
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
    "confirm_goods_receipt" as never,
    {
      _receipt_id: body.receipt_id,
      _user_id: userId,
      _lines: body.lines,
      _temp_gekoeld: body.temp_gekoeld ?? null,
      _temp_vries: body.temp_vries ?? null,
      _temp_skip: body.temp_skip ?? {},
    } as never,
  );

  if (rpcError) {
    const msg = rpcError.message || "";
    if (msg.includes("forbidden")) {
      return errorResponse("forbidden", "Geen permissie voor deze locatie", 403);
    }
    if (msg.includes("receipt_not_found")) {
      return errorResponse("receipt_not_found", "Pakbon bestaat niet", 404);
    }
    if (msg.includes("already_confirmed")) {
      return errorResponse(
        "already_confirmed",
        "Pakbon is al bevestigd of geannuleerd",
        409,
      );
    }
    console.error("RPC failure", rpcError);
    return errorResponse("internal_error", msg || "RPC failed", 500, {
      pg_code: rpcError.code,
    });
  }

  const summary = rpcResult as Record<string, unknown> | null;
  if (!summary || typeof summary !== "object") {
    return errorResponse("internal_error", "RPC returned empty result", 500);
  }

  // ----- 4. Realtime broadcast -----
  // Channel: pakbon:{location_id}, event: goods_receipt.updated
  const locationId = String(summary.location_id || "");
  if (locationId) {
    const channel = supabaseAdmin.channel(`pakbon:${locationId}`);
    try {
      await channel.send({
        type: "broadcast",
        event: "goods_receipt.updated",
        payload: {
          receipt_id: summary.receipt_id,
          new_status: summary.new_status,
          summary,
        },
      });
    } catch (e) {
      // Broadcast-fout is niet fataal — RPC is al gecommit
      console.error("Broadcast emit failed", e);
    } finally {
      await supabaseAdmin.removeChannel(channel);
    }
  }

  return jsonResponse(200, { ok: true, summary });
});
