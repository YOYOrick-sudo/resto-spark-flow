// supabase/functions/receive-pakbon-email/index.ts
// Sprint Pakbon V1 — Inbound email-receiver via Resend Inbound + Svix.
//
// FLOW:
//   1. Svix-verify webhook (fail-safe: weiger als secret ontbreekt)
//   2. Parse to-address pattern: pakbon+{slug}@mail.shouf.ai
//   3. Match location via locations.pakbon_slug
//   4. Match leverancier via leveranciers.email_domains (whitelist) of from-domain
//   5. Rate-limit: max 50/uur per to_address
//   6. Fetch full email content + attachments via Resend API
//   7. Validate attachments (PDF/image, ≤25MB)
//   8. Upload naar storage: pakbonnen/{location_id}/{yyyy-mm}/{resend_email_id}/{filename}
//   9. Insert pakbon_email_intake row + goods_receipts (status=verwachten, ai_parse_status=pending)
//  10. Trigger parse-pakbon (fire-and-forget, service-role)
//
// SECURITY:
//   - CORS expliciet (alleen OPTIONS preflight, webhook is server-to-server)
//   - Svix-verify met fail-safe: production weigert zonder secret
//   - Geen info-leak in error responses (interne errors → console.error,
//     client krijgt generieke message)
//   - Rate-limit per to_address voorkomt spam-flood
//   - File-type whitelist (alleen application/pdf + image/*)
//   - File-size limit 25MB per attachment
//
// IDEMPOTENCY:
//   Resend stuurt unieke webhook-ids. We dedupen op (resend_message_id) — als
//   intake-row al bestaat → return 200 (acknowledgement) zonder re-process.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Webhook } from "https://esm.sh/svix@1.24.0";

declare const EdgeRuntime:
  | { waitUntil: (p: Promise<unknown>) => void }
  | undefined;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// =====================================================
// Constants
// =====================================================
const INBOUND_DOMAIN = "mail.shouf.ai";
const RATE_LIMIT_PER_HOUR = 50;
const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024; // 25 MB
const ALLOWED_MIMES = /^(application\/pdf|image\/.+)$/i;

// =====================================================
// Helpers
// =====================================================

/**
 * Extract slug uit to-address pattern: pakbon+{slug}@mail.shouf.ai
 * Returns null als pattern niet matcht.
 */
function extractSlugFromToAddress(to: string): string | null {
  if (!to) return null;
  const lower = to.toLowerCase().trim();
  // Strip "Name <email>" wrapping
  const match = lower.match(/<([^>]+)>/);
  const email = match ? match[1] : lower;
  // pattern: pakbon+SLUG@mail.shouf.ai
  const re = new RegExp(
    `^pakbon\\+([a-z0-9][a-z0-9-]{0,63})@${INBOUND_DOMAIN.replace(/\./g, "\\.")}$`,
  );
  const m = email.match(re);
  return m ? m[1] : null;
}

/**
 * Extract domain (lowercased) uit "Name <user@domain.tld>" of "user@domain.tld".
 */
function extractFromDomain(from: string): string | null {
  if (!from) return null;
  const lower = from.toLowerCase().trim();
  const m = lower.match(/<([^>]+)>/);
  const email = m ? m[1] : lower;
  const at = email.lastIndexOf("@");
  if (at < 0) return null;
  return email.slice(at + 1).trim();
}

/**
 * Sanitize filename: only safe chars, max 200 chars, behoud extensie.
 */
function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
  return cleaned || `file_${Date.now()}`;
}

/**
 * Format yyyy-mm voor storage path.
 */
function yyyymm(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

// =====================================================
// Resend Inbound payload + attachments API
// =====================================================
//
// Resend Inbound webhook (event: "email.received") bevat ALLEEN metadata,
// GEEN attachment bytes. Per Resend docs:
//   "Webhooks do not include the actual content of attachments, only their
//    metadata. You must call the Attachments API to retrieve the content."
//   https://resend.com/docs/dashboard/receiving/attachments
//
// Webhook payload-vorm:
//   {
//     type: "email.received",
//     data: {
//       email_id: "uuid",
//       from, to[], subject, message_id, created_at, cc, bcc,
//       attachments: [
//         { id, filename, content_type, content_disposition, content_id }
//       ]
//     }
//   }
//
// Attachment fetch flow (2 stappen):
//   1. GET https://api.resend.com/emails/receiving/{email_id}/attachments/{att_id}
//      Headers: Authorization: Bearer {RESEND_API_KEY}
//      Response: { object, id, filename, size, content_type, download_url, expires_at }
//   2. GET {download_url}  (signed CDN URL, geen auth header)
//      Response: raw bytes
//
// Bron: https://resend.com/docs/api-reference/emails/retrieve-received-email-attachment

interface ResendInboundAttachmentMeta {
  id: string;
  filename: string;
  content_type?: string;
  content_disposition?: string | null;
  content_id?: string | null;
}

interface ResendAttachmentFetchResult {
  bytes: Uint8Array | null;
  contentType: string;
  filename: string;
  size: number | null;
  errorReason: string | null;
  errorCode: "metadata_404" | "metadata_403" | "metadata_other" | "download_failed" | "size_exceeded" | "type_blocked" | null;
}

/**
 * Fetch attachment metadata + bytes via Resend Inbound API.
 * Returns bytes=null met errorReason als iets misgaat (graceful).
 */
async function fetchResendInboundAttachment(
  emailId: string,
  attachmentId: string,
  apiKey: string,
): Promise<ResendAttachmentFetchResult> {
  const baseResult: ResendAttachmentFetchResult = {
    bytes: null,
    contentType: "",
    filename: "",
    size: null,
    errorReason: null,
    errorCode: null,
  };

  // Stap 1: metadata + signed download URL
  const metaUrl = `https://api.resend.com/emails/receiving/${emailId}/attachments/${attachmentId}`;
  let metaRes: Response;
  try {
    metaRes = await fetch(metaUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
    });
  } catch (err) {
    return {
      ...baseResult,
      errorReason: `metadata fetch threw: ${err instanceof Error ? err.message : String(err)}`,
      errorCode: "metadata_other",
    };
  }

  if (!metaRes.ok) {
    const body = await metaRes.text().catch(() => "");
    const code = metaRes.status === 404
      ? "metadata_404"
      : metaRes.status === 403
      ? "metadata_403"
      : "metadata_other";
    return {
      ...baseResult,
      errorReason: `attachment metadata fetch failed: ${metaRes.status} ${body.slice(0, 200)}`,
      errorCode: code,
    };
  }

  const meta = await metaRes.json().catch(() => null) as
    | { download_url?: string; content_type?: string; filename?: string; size?: number }
    | null;

  if (!meta?.download_url) {
    return {
      ...baseResult,
      errorReason: "metadata response zonder download_url",
      errorCode: "metadata_other",
    };
  }

  const filename = meta.filename ?? "attachment";
  const contentType = (meta.content_type ?? "").toLowerCase();
  const size = typeof meta.size === "number" ? meta.size : null;

  // Stap 2: download bytes via signed URL
  let dlRes: Response;
  try {
    dlRes = await fetch(meta.download_url);
  } catch (err) {
    return {
      ...baseResult,
      filename,
      contentType,
      size,
      errorReason: `attachment download threw: ${err instanceof Error ? err.message : String(err)}`,
      errorCode: "download_failed",
    };
  }

  if (!dlRes.ok) {
    return {
      ...baseResult,
      filename,
      contentType,
      size,
      errorReason: `attachment download failed: ${dlRes.status}`,
      errorCode: "download_failed",
    };
  }

  const buf = await dlRes.arrayBuffer();
  return {
    bytes: new Uint8Array(buf),
    contentType,
    filename,
    size,
    errorReason: null,
    errorCode: null,
  };
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
  // 1. Svix-verify (fail-safe)
  // ===========================================================
  const webhookSecret = Deno.env.get("RESEND_INBOUND_WEBHOOK_SECRET");
  const rawBody = await req.text();
  let payload: any;

  if (!webhookSecret) {
    console.warn(
      "[receive-pakbon-email] RESEND_INBOUND_WEBHOOK_SECRET niet geconfigureerd — webhook geweigerd (production-safe default).",
    );
    return new Response(
      JSON.stringify({ error: "Webhook verification not configured" }),
      {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  try {
    const wh = new Webhook(webhookSecret);
    const headers = {
      "svix-id": req.headers.get("svix-id") ?? "",
      "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
      "svix-signature": req.headers.get("svix-signature") ?? "",
    };
    payload = wh.verify(rawBody, headers);
  } catch (err) {
    console.warn("[receive-pakbon-email] Svix verify failed:", err);
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ===========================================================
  // 2. Parse webhook payload
  // ===========================================================
  // Resend Inbound webhook structure (per docs nov 2025):
  //   { type: "email.received", data: { email_id, from, to[], subject, ... } }
  const emailData = payload?.data;
  if (!emailData?.email_id) {
    console.warn("[receive-pakbon-email] payload zonder email_id:", payload?.type);
    return new Response(JSON.stringify({ error: "Invalid payload" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const resendMessageId: string = emailData.email_id;
  const fromAddress: string = emailData.from ?? "";
  const toAddresses: string[] = Array.isArray(emailData.to)
    ? emailData.to
    : [emailData.to ?? ""];
  const subject: string = emailData.subject ?? "";

  // Find first to-address dat ons pattern matcht (kan in CC zitten)
  let primaryTo: string | null = null;
  let slug: string | null = null;
  for (const addr of toAddresses) {
    const candidate = extractSlugFromToAddress(addr);
    if (candidate) {
      primaryTo = addr;
      slug = candidate;
      break;
    }
  }

  if (!slug || !primaryTo) {
    console.warn(
      `[receive-pakbon-email] geen geldig pakbon+slug pattern in to: ${toAddresses.join(",")}`,
    );
    // Return 200 zodat Resend niet retried — dit is permanent unrouteable
    return new Response(
      JSON.stringify({ status: "ignored", reason: "no_slug_pattern" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // ===========================================================
  // 3. Init Supabase admin client
  // ===========================================================
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // ===========================================================
  // 4. Idempotency check — al verwerkt?
  // ===========================================================
  const { data: existingIntake } = await supabase
    .from("pakbon_email_intake")
    .select("id, ai_parse_status")
    .eq("resend_message_id", resendMessageId)
    .maybeSingle();

  if (existingIntake) {
    console.log(
      `[receive-pakbon-email] duplicate webhook voor ${resendMessageId} — skip`,
    );
    return new Response(
      JSON.stringify({ status: "duplicate", intake_id: existingIntake.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // ===========================================================
  // 5. Match location via slug
  // ===========================================================
  const { data: location, error: locErr } = await supabase
    .from("locations")
    .select("id, organization_id, pakbon_cc_addresses")
    .eq("pakbon_slug", slug)
    .maybeSingle();

  if (locErr || !location) {
    console.warn(
      `[receive-pakbon-email] geen location voor slug=${slug}`,
      locErr?.message,
    );
    // Log intake voor audit trail
    await supabase.from("pakbon_email_intake").insert({
      to_address: primaryTo,
      from_address: fromAddress,
      subject,
      resend_message_id: resendMessageId,
      ai_parse_status: "rejected_unknown_location",
      error_reason: `Geen location gevonden voor slug "${slug}"`,
    });
    return new Response(
      JSON.stringify({ status: "rejected", reason: "unknown_location" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // ===========================================================
  // 6. Rate-limit check (50/uur per to_address)
  // ===========================================================
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentCount } = await supabase
    .from("pakbon_email_intake")
    .select("id", { count: "exact", head: true })
    .eq("to_address", primaryTo)
    .gte("received_at", oneHourAgo);

  if ((recentCount ?? 0) >= RATE_LIMIT_PER_HOUR) {
    console.warn(
      `[receive-pakbon-email] rate-limit bereikt voor ${primaryTo}: ${recentCount}/uur`,
    );
    await supabase.from("pakbon_email_intake").insert({
      to_address: primaryTo,
      from_address: fromAddress,
      subject,
      resend_message_id: resendMessageId,
      matched_location_id: location.id,
      ai_parse_status: "rejected_duplicate", // hergebruikt voor rate-limit
      error_reason: `Rate-limit bereikt (${RATE_LIMIT_PER_HOUR}/uur per adres)`,
    });
    return new Response(
      JSON.stringify({ status: "rejected", reason: "rate_limit" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // ===========================================================
  // 7. Match leverancier via from-domain (whitelist of fallback)
  // ===========================================================
  const fromDomain = extractFromDomain(fromAddress);
  let leverancierId: string | null = null;
  if (fromDomain) {
    // Probeer eerst whitelist-match (email_domains array bevat fromDomain)
    const { data: levMatch } = await supabase
      .from("leveranciers")
      .select("id, naam, email_domains")
      .eq("location_id", location.id)
      .eq("is_actief", true)
      .contains("email_domains", [fromDomain])
      .maybeSingle();

    if (levMatch) {
      leverancierId = levMatch.id;
    } else {
      // Fallback: match op exact domain in `email`-kolom (suffix-check)
      const { data: levByEmail } = await supabase
        .from("leveranciers")
        .select("id, naam, email")
        .eq("location_id", location.id)
        .eq("is_actief", true)
        .ilike("email", `%@${fromDomain}`)
        .maybeSingle();
      if (levByEmail) leverancierId = levByEmail.id;
    }
  }

  // Geen leverancier? Reject (security: alleen bekende afzenders).
  if (!leverancierId) {
    console.warn(
      `[receive-pakbon-email] onbekende afzender domain=${fromDomain} location=${location.id}`,
    );
    await supabase.from("pakbon_email_intake").insert({
      to_address: primaryTo,
      from_address: fromAddress,
      subject,
      resend_message_id: resendMessageId,
      matched_location_id: location.id,
      ai_parse_status: "rejected_unknown_sender",
      error_reason: `Onbekende afzender (domain=${fromDomain ?? "?"}). Voeg toe aan leverancier email_domains.`,
    });
    return new Response(
      JSON.stringify({ status: "rejected", reason: "unknown_sender" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // ===========================================================
  // 8. Fetch attachments via Resend Inbound Attachments API
  // ===========================================================
  // Resend Inbound webhooks bevatten ALLEEN attachment-metadata (id, filename,
  // content_type), GEEN bytes. Per Resend docs moeten we de Attachments API
  // aanroepen om de signed download_url op te halen, daarna de bytes downloaden.
  // Bron: https://resend.com/docs/dashboard/receiving/attachments
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.error(
      "[receive-pakbon-email] RESEND_API_KEY niet geconfigureerd — kan attachments niet ophalen",
    );
    await supabase.from("pakbon_email_intake").insert({
      to_address: primaryTo,
      from_address: fromAddress,
      subject,
      resend_message_id: resendMessageId,
      matched_location_id: location.id,
      matched_leverancier_id: leverancierId,
      ai_parse_status: "failed",
      error_reason: "RESEND_API_KEY ontbreekt in edge function config",
    });
    return new Response(
      JSON.stringify({ status: "config_error", reason: "missing_resend_api_key" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const rawAttachments: ResendInboundAttachmentMeta[] = Array.isArray(
    emailData.attachments,
  )
    ? emailData.attachments
    : [];

  if (rawAttachments.length === 0) {
    console.warn(
      `[receive-pakbon-email] webhook bevat geen attachments voor ${resendMessageId}`,
    );
    await supabase.from("pakbon_email_intake").insert({
      to_address: primaryTo,
      from_address: fromAddress,
      subject,
      resend_message_id: resendMessageId,
      matched_location_id: location.id,
      matched_leverancier_id: leverancierId,
      ai_parse_status: "failed",
      error_reason: "Email bevat geen attachments",
    });
    return new Response(
      JSON.stringify({ status: "no_attachments" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // ===========================================================
  // 9. Fetch + upload attachments naar storage
  // ===========================================================
  const uploadedUrls: string[] = [];
  const attachmentErrors: string[] = [];
  const monthFolder = yyyymm(new Date());
  const basePath = `${location.id}/${monthFolder}/${resendMessageId}`;

  for (const att of rawAttachments) {
    if (!att?.id) {
      attachmentErrors.push(`attachment zonder id: ${att?.filename ?? "?"}`);
      console.warn("[receive-pakbon-email] attachment zonder id:", att);
      continue;
    }

    // Pre-check: webhook-metadata content_type tegen whitelist (bespaart fetch)
    const webhookContentType = (att.content_type ?? "").toLowerCase();
    if (webhookContentType && !ALLOWED_MIMES.test(webhookContentType)) {
      attachmentErrors.push(
        `${att.filename}: type ${webhookContentType} not allowed`,
      );
      console.warn(
        `[receive-pakbon-email] attachment skipped (type=${webhookContentType}): ${att.filename}`,
      );
      continue;
    }

    const fetched = await fetchResendInboundAttachment(
      resendMessageId,
      att.id,
      resendApiKey,
    );

    if (fetched.errorReason) {
      attachmentErrors.push(`${att.filename ?? att.id}: ${fetched.errorReason}`);
      console.error(
        `[receive-pakbon-email] attachment fetch failed for ${att.filename ?? att.id}: ${fetched.errorReason}`,
      );
      continue;
    }

    if (!fetched.bytes) {
      attachmentErrors.push(`${att.filename ?? att.id}: geen bytes ontvangen`);
      continue;
    }

    // Server-side validation (auteur metadata kan ontbreken/liegen)
    const finalContentType = fetched.contentType || webhookContentType;
    if (!ALLOWED_MIMES.test(finalContentType)) {
      attachmentErrors.push(
        `${fetched.filename}: type ${finalContentType} not allowed`,
      );
      console.warn(
        `[receive-pakbon-email] post-fetch type-check faalde: ${finalContentType}`,
      );
      continue;
    }

    if (fetched.bytes.byteLength > MAX_ATTACHMENT_SIZE) {
      attachmentErrors.push(
        `${fetched.filename}: size ${fetched.bytes.byteLength} > limit ${MAX_ATTACHMENT_SIZE}`,
      );
      console.warn(
        `[receive-pakbon-email] attachment too large (${fetched.bytes.byteLength}): ${fetched.filename}`,
      );
      continue;
    }

    const safeName = sanitizeFilename(fetched.filename || att.filename || "attachment");
    const storagePath = `${basePath}/${safeName}`;
    const { error: upErr } = await supabase.storage
      .from("pakbonnen")
      .upload(storagePath, fetched.bytes, {
        contentType: finalContentType,
        upsert: true,
      });
    if (upErr) {
      attachmentErrors.push(`${safeName}: storage upload failed: ${upErr.message}`);
      console.error(
        `[receive-pakbon-email] storage upload failed ${storagePath}:`,
        upErr.message,
      );
      continue;
    }
    uploadedUrls.push(storagePath);
  }

  if (uploadedUrls.length === 0) {
    const errorDetail = attachmentErrors.length
      ? attachmentErrors.join(" | ").slice(0, 500)
      : "Geen geldige PDF/image-attachments gevonden";
    console.warn(
      `[receive-pakbon-email] geen geldige attachments voor ${resendMessageId}: ${errorDetail}`,
    );
    await supabase.from("pakbon_email_intake").insert({
      to_address: primaryTo,
      from_address: fromAddress,
      subject,
      resend_message_id: resendMessageId,
      matched_location_id: location.id,
      matched_leverancier_id: leverancierId,
      ai_parse_status: "failed",
      error_reason: errorDetail,
    });
    return new Response(
      JSON.stringify({ status: "no_attachments", errors: attachmentErrors }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // ===========================================================
  // 10. Maak goods_receipt + intake row aan
  // ===========================================================
  const { data: goodsReceipt, error: grErr } = await supabase
    .from("goods_receipts")
    .insert({
      location_id: location.id,
      organization_id: location.organization_id,
      leverancier_id: leverancierId,
      ontvangst_status: "verwachten",
      ai_generated: true,
      ai_parse_status: "pending",
      email_raw_url: uploadedUrls[0], // primary attachment als referentie
    })
    .select("id")
    .single();

  if (grErr || !goodsReceipt) {
    console.error("[receive-pakbon-email] goods_receipt insert failed:", grErr);
    return new Response(
      JSON.stringify({ error: "Failed to create goods_receipt" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const { data: intake, error: intakeErr } = await supabase
    .from("pakbon_email_intake")
    .insert({
      to_address: primaryTo,
      from_address: fromAddress,
      subject,
      resend_message_id: resendMessageId,
      matched_location_id: location.id,
      matched_leverancier_id: leverancierId,
      ai_parse_status: "pending",
      goods_receipt_id: goodsReceipt.id,
      attachments_urls: uploadedUrls,
    })
    .select("id")
    .single();

  if (intakeErr) {
    console.error("[receive-pakbon-email] intake insert failed:", intakeErr);
    // goods_receipt blijft staan — chef kan handmatig oppakken
  }

  // ===========================================================
  // 11. Trigger parse-pakbon (fire-and-forget)
  // ===========================================================
  const triggerParse = async () => {
    try {
      const res = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/parse-pakbon`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            goods_receipt_id: goodsReceipt.id,
            intake_id: intake?.id,
            attachment_path: uploadedUrls[0],
          }),
        },
      );
      if (!res.ok) {
        console.error(
          `[receive-pakbon-email] parse-pakbon trigger ${res.status}: ${await res.text()}`,
        );
      }
    } catch (err) {
      console.error("[receive-pakbon-email] parse-pakbon trigger threw:", err);
    }
  };

  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
    EdgeRuntime.waitUntil(triggerParse());
  } else {
    triggerParse(); // best-effort
  }

  return new Response(
    JSON.stringify({
      status: "accepted",
      goods_receipt_id: goodsReceipt.id,
      intake_id: intake?.id,
      attachments_count: uploadedUrls.length,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
