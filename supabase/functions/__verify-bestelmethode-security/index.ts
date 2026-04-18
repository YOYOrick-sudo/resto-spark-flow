// Tijdelijke test-runner. Roept de __test_bestelmethode_security__ RPC aan
// als service_role en geeft het resultaat terug. Wordt na verificatie
// verwijderd (samen met de RPC) in een vervolg-migratie.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  let params: any = {};
  try { params = await req.json(); } catch { /* GET ok */ }

  const LOC = params.location_id ?? "22222222-2222-2222-2222-222222222222";
  const OWNER = params.owner_uid ?? "452a65e8-75b7-4cd1-9736-66835823382e";
  const KITCHEN = params.kitchen_uid ?? "44477838-6bf6-4f91-81b4-fe459b58a484";

  // Pak een concept-bestelling
  const { data: bestelling, error: bErr } = await supabase
    .from("bestellingen")
    .select("id, bestelmethode, status")
    .eq("location_id", LOC)
    .eq("status", "concept")
    .limit(1)
    .single();
  if (bErr || !bestelling) {
    return new Response(JSON.stringify({ error: "geen concept-bestelling", details: bErr }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data, error } = await (supabase as any).rpc("__test_bestelmethode_security__", {
    _location_id: LOC,
    _owner_uid: OWNER,
    _kitchen_candidate_uid: KITCHEN,
    _bestelling_id: bestelling.id,
  });

  return new Response(JSON.stringify({
    bestelling_id: bestelling.id,
    orig_methode: bestelling.bestelmethode,
    rpc_error: error?.message ?? null,
    results: data,
  }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
