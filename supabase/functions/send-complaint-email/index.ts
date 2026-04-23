// supabase/functions/send-complaint-email/index.ts
// Sprint Pakbon V1 — Stuur klacht-email naar leverancier voor credit_note_request.
//
// AUTHENTICATIE:
//   verify_jwt=true in config.toml. Alleen ingelogde users met rol
//   owner/manager/chef binnen de location mogen klachten versturen.
//
// FLOW:
//   1. Auth check (JWT verify automatisch + getClaims voor user_id)
//   2. Body validatie (credit_note_request_id, optionele custom message)
//   3. Fetch credit_note_request + receipt + leverancier (alles in één query)
//   4. RLS-check via location toegang (user_locations)
//   5. Role-check: alleen owner/manager/chef mogen versturen
//   6. Stuur email via Resend (outbound mail.shouf.ai)
//   7. Update credit_note_request: status='email_verzonden', email_message_id, email_verzonden_at
//
// SECURITY:
//   - JWT-protected
//   - Role-check op writes
//   - Input validatie via Zod-achtige check
//   - CORS expliciet
//   - Geen info-leak: errors loggen intern, generieke message naar client

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// =====================================================
// Types
// =====================================================
interface RequestBody {
  credit_note_request_id: string;
  custom_message?: string;
}

interface CreditNoteContext {
  id: string;
  type: string;
  aantal: number | null;
  eenheid: string | null;
  notities: string | null;
  geschatte_waarde: number | null;
  status: string;
  goods_receipt: {
    id: string;
    pakbon_nummer: string | null;
    levering_datum: string | null;
    location_id: string;
  };
  leverancier: {
    id: string;
    naam: string;
    email: string | null;
  };
  goods_receipt_line?: {
    product_naam_herkend: string;
    hoeveelheid_verwacht: number | null;
    eenheid_verwacht: string | null;
  } | null;
}

// =====================================================
// Helpers
// =====================================================

function validateBody(raw: unknown): { ok: true; data: RequestBody } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Invalid body" };
  }
  const b = raw as Record<string, unknown>;
  const id = b.credit_note_request_id;
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) {
    return { ok: false, error: "Invalid credit_note_request_id" };
  }
  const msg = b.custom_message;
  if (msg !== undefined && (typeof msg !== "string" || msg.length > 2000)) {
    return { ok: false, error: "custom_message invalid (max 2000 chars)" };
  }
  return { ok: true, data: { credit_note_request_id: id, custom_message: msg as string | undefined } };
}

function buildEmailHtml(ctx: CreditNoteContext, customMessage: string | undefined): string {
  const typeLabels: Record<string, string> = {
    missing: "Niet geleverd",
    beschadigd: "Beschadigd geleverd",
    verkeerd: "Verkeerd product geleverd",
    meer_dan_besteld: "Meer geleverd dan besteld",
  };
  const typeLabel = typeLabels[ctx.type] ?? ctx.type;
  const product = ctx.goods_receipt_line?.product_naam_herkend ?? "Onbekend product";
  const aantal = ctx.aantal ?? ctx.goods_receipt_line?.hoeveelheid_verwacht ?? "?";
  const eenheid = ctx.eenheid ?? ctx.goods_receipt_line?.eenheid_verwacht ?? "";
  const datum = ctx.goods_receipt.levering_datum ?? "onbekend";
  const pakbon = ctx.goods_receipt.pakbon_nummer ?? "(geen nummer)";

  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"><title>Reclamatie levering</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
  <h2 style="color: #b91c1c; margin-bottom: 8px;">Reclamatie levering</h2>
  <p style="color: #666; margin-top: 0;">Pakbon ${escapeHtml(pakbon)} — leverdatum ${escapeHtml(datum)}</p>

  <div style="background: #fef2f2; border-left: 4px solid #b91c1c; padding: 16px; margin: 24px 0; border-radius: 4px;">
    <strong>${escapeHtml(typeLabel)}</strong><br>
    Product: ${escapeHtml(product)}<br>
    Aantal: ${escapeHtml(String(aantal))} ${escapeHtml(eenheid)}
    ${ctx.geschatte_waarde ? `<br>Geschatte waarde: €${ctx.geschatte_waarde.toFixed(2)}` : ""}
  </div>

  ${ctx.notities ? `<p><strong>Toelichting:</strong><br>${escapeHtml(ctx.notities).replace(/\n/g, "<br>")}</p>` : ""}

  ${customMessage ? `<p style="margin-top: 24px;">${escapeHtml(customMessage).replace(/\n/g, "<br>")}</p>` : ""}

  <p style="margin-top: 32px;">Graag ontvangen wij een creditnota of vervangende levering.</p>

  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">
  <p style="color: #999; font-size: 12px;">
    Verzonden via Shouf — geautomatiseerde reclamatie op basis van geregistreerde leveringscontrole.
  </p>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// =====================================================
// Handler
// =====================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ===========================================================
  // 1. Auth (JWT verify=true; haal user op via getClaims)
  // ===========================================================
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAuth = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsErr } = await supabaseAuth.auth.getClaims(token);
  if (claimsErr || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = claimsData.claims.sub;

  // ===========================================================
  // 2. Body validatie
  // ===========================================================
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const parsed = validateBody(raw);
  if (!parsed.ok) {
    return new Response(JSON.stringify({ error: parsed.error }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ===========================================================
  // 3. Fetch context met service-role (bypass RLS, we doen check zelf)
  // ===========================================================
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: cnr, error: cnrErr } = await supabaseAdmin
    .from("credit_note_requests")
    .select(
      `id, type, aantal, eenheid, notities, geschatte_waarde, status,
       goods_receipt:goods_receipts!credit_note_requests_goods_receipt_id_fkey (
         id, pakbon_nummer, levering_datum, location_id
       ),
       leverancier:leveranciers!credit_note_requests_leverancier_id_fkey (
         id, naam, email
       ),
       goods_receipt_line:goods_receipt_lines!credit_note_requests_goods_receipt_line_id_fkey (
         product_naam_herkend, hoeveelheid_verwacht, eenheid_verwacht
       )`,
    )
    .eq("id", parsed.data.credit_note_request_id)
    .maybeSingle();

  if (cnrErr || !cnr) {
    console.warn("[send-complaint-email] credit_note niet gevonden:", cnrErr?.message);
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ctx = cnr as unknown as CreditNoteContext;

  if (!ctx.goods_receipt?.location_id) {
    return new Response(JSON.stringify({ error: "Invalid receipt" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!ctx.leverancier?.email) {
    return new Response(
      JSON.stringify({ error: "Leverancier heeft geen email-adres" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // ===========================================================
  // 4+5. RLS + role-check: user moet location-toegang hebben
  //     én rol owner/manager/chef binnen die location.
  // ===========================================================
  const { data: roleRow } = await supabaseAdmin
    .from("user_locations")
    .select("role")
    .eq("user_id", userId)
    .eq("location_id", ctx.goods_receipt.location_id)
    .maybeSingle();

  if (!roleRow) {
    console.warn(
      `[send-complaint-email] user ${userId} heeft geen toegang tot location ${ctx.goods_receipt.location_id}`,
    );
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const allowedRoles = ["owner", "manager", "chef"];
  if (!allowedRoles.includes(roleRow.role)) {
    console.warn(
      `[send-complaint-email] role ${roleRow.role} mag geen klachten versturen`,
    );
    return new Response(
      JSON.stringify({ error: "Onvoldoende rechten voor deze actie" }),
      {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Status-guard: voorkom dubbele verzending
  if (ctx.status === "email_verzonden") {
    return new Response(
      JSON.stringify({ error: "Email is al eerder verzonden" }),
      {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // ===========================================================
  // 6. Verstuur email via Resend
  // ===========================================================
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.error("[send-complaint-email] RESEND_API_KEY niet geconfigureerd");
    return new Response(JSON.stringify({ error: "Email service unavailable" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const html = buildEmailHtml(ctx, parsed.data.custom_message);
  const subject = `Reclamatie levering ${ctx.goods_receipt.pakbon_nummer ?? ""} — ${ctx.leverancier.naam}`.trim();

  let resendMessageId: string | null = null;
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Shouf <reclamatie@mail.shouf.ai>",
        to: [ctx.leverancier.email],
        subject,
        html,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error(`[send-complaint-email] Resend ${resp.status}: ${errText}`);
      return new Response(
        JSON.stringify({ error: "Email kon niet verzonden worden" }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const json = await resp.json();
    resendMessageId = json.id ?? null;
  } catch (err) {
    console.error("[send-complaint-email] Resend threw:", err);
    return new Response(
      JSON.stringify({ error: "Email kon niet verzonden worden" }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // ===========================================================
  // 7. Update credit_note_request
  // ===========================================================
  const { error: updErr } = await supabaseAdmin
    .from("credit_note_requests")
    .update({
      status: "email_verzonden",
      email_message_id: resendMessageId,
      email_verzonden_at: new Date().toISOString(),
    })
    .eq("id", ctx.id);

  if (updErr) {
    console.error("[send-complaint-email] update credit_note failed:", updErr);
    // Email is al verzonden; status-update faal is niet-fataal voor de user
  }

  return new Response(
    JSON.stringify({
      status: "ok",
      message_id: resendMessageId,
      sent_to: ctx.leverancier.email,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
