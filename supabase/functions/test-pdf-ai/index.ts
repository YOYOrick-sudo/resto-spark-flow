// TIJDELIJK — diagnose voor PDF via Lovable AI Gateway (Path A vs Path B)
// Verwijder na gebruik.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Hardcoded bekende PDF (Kooyman test)
  const storagePath =
    "22222222-2222-2222-2222-222222222222/33c07466-2088-4f29-a673-d5716af3a88a.pdf";
  const locationId = "22222222-2222-2222-2222-222222222222";

  try {
    // 1. Download
    const { data: blob, error: dlErr } = await supabase.storage
      .from("facturen")
      .download(storagePath);
    if (dlErr || !blob) {
      return new Response(
        JSON.stringify({ stage: "download", error: dlErr?.message ?? "no blob" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const bytes = new Uint8Array(await blob.arrayBuffer());
    const base64 = uint8ToBase64(bytes);
    console.log(
      `[test-pdf-ai] downloaded ${bytes.length}b, base64 ${base64.length} chars`
    );

    // 2. Resolve org
    const { data: loc } = await supabase
      .from("locations")
      .select("organization_id")
      .eq("id", locationId)
      .single();
    const orgId = loc?.organization_id;
    if (!orgId) {
      return new Response(
        JSON.stringify({ stage: "org", error: "no organization_id" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // 3. Path A: PDF via documents[]
    try {
      const result = await callAI({
        featureKey: "test_pdf_ai",
        organizationId: orgId,
        locationId,
        modelOverride: "google/gemini-2.5-pro",
        skipFallback: true, // geen flash-fallback (heeft zelfde PDF-issue)
        systemPrompt: "Je bent een document-parser. Antwoord in 1 zin.",
        prompt: "Wat is de leverancier en het factuurnummer op dit document?",
        documents: [{ data: base64, mimeType: "application/pdf" }],
        maxTokens: 200,
      });

      return new Response(
        JSON.stringify({
          path: "A",
          success: true,
          model: result.model,
          text: result.text,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (err: any) {
      return new Response(
        JSON.stringify({
          path: "A",
          success: false,
          error: String(err?.message ?? err),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }
  } catch (err: any) {
    return new Response(
      JSON.stringify({ stage: "outer", error: String(err?.message ?? err) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
