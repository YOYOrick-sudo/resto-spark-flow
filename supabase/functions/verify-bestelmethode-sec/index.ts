// Tijdelijke test-runner. Twee endpoints:
//  - default (POST /): test B/C/D via __test_bestelmethode_security__ RPC
//  - POST {action:"test_e"}: test E — voor elk van de 4 bestelmethodes
//    (email/api/portal/handmatig) wordt een concept-bestelling tijdelijk
//    op die methode gezet en send-order-email aangeroepen. Voor 'email'
//    wordt dry_run=true met service-role gebruikt zodat er geen echte mail
//    wordt verstuurd. Status wordt na elke ronde nagelezen, en aan het
//    einde wordt de bestelling teruggezet.
// Wordt na verificatie verwijderd.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOC_DEFAULT = "22222222-2222-2222-2222-222222222222";
const OWNER_DEFAULT = "452a65e8-75b7-4cd1-9736-66835823382e";
const KITCHEN_DEFAULT = "44477838-6bf6-4f91-81b4-fe459b58a484";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let params: any = {};
  try { params = await req.json(); } catch { /* ok */ }
  const action = params.action ?? "test_bcd";

  if (action === "test_e") return await testE(supabase);
  return await testBCD(supabase, params);
});

async function testE(supabase: any) {
  const { data: bestelling, error: bErr } = await supabase
    .from("bestellingen")
    .select("id, bestelmethode, status, location_id, leverancier_id")
    .eq("location_id", LOC_DEFAULT)
    .eq("status", "concept")
    .limit(1)
    .single();
  if (bErr || !bestelling) return json({ error: "geen concept-bestelling", details: bErr });

  const ORIG_METHODE = bestelling.bestelmethode;
  const ORIG_STATUS = bestelling.status;
  const BESTELLING_ID = bestelling.id;

  const results: any[] = [];
  const methodes = ["email", "api", "portal", "handmatig"] as const;

  for (const methode of methodes) {
    const { error: setErr } = await supabase
      .from("bestellingen")
      .update({
        bestelmethode: methode,
        status: "concept",
        laatst_verzonden: null,
        besteldatum: null,
      })
      .eq("id", BESTELLING_ID);
    if (setErr) {
      results.push({ methode, error: `set: ${setErr.message}` });
      continue;
    }

    const useDryRun = methode === "email";
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-order-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
      },
      body: JSON.stringify({ bestelling_id: BESTELLING_ID, dry_run: useDryRun }),
    });
    const text = await res.text();
    let body: any;
    try { body = JSON.parse(text); } catch { body = text; }

    const { data: post } = await supabase
      .from("bestellingen")
      .select("status, bestelmethode, laatst_verzonden, besteldatum")
      .eq("id", BESTELLING_ID)
      .single();

    // Trim grote html-velden voor leesbaarheid
    if (body && typeof body === "object" && body.html) {
      body.html_length = body.html.length;
      body.html_preview = String(body.html).slice(0, 200);
      delete body.html;
    }

    results.push({
      methode,
      http_status: res.status,
      response: body,
      post_state: post,
    });
  }

  // Cleanup
  await supabase
    .from("bestellingen")
    .update({
      bestelmethode: ORIG_METHODE,
      status: ORIG_STATUS,
      laatst_verzonden: null,
      besteldatum: null,
    })
    .eq("id", BESTELLING_ID);

  return json({
    bestelling_id: BESTELLING_ID,
    restored_to: { methode: ORIG_METHODE, status: ORIG_STATUS },
    results,
  });
}

async function testBCD(supabase: any, params: any) {
  const LOC = params.location_id ?? LOC_DEFAULT;
  const OWNER = params.owner_uid ?? OWNER_DEFAULT;
  const KITCHEN = params.kitchen_uid ?? KITCHEN_DEFAULT;

  const { data: bestelling, error: bErr } = await supabase
    .from("bestellingen")
    .select("id, bestelmethode, status")
    .eq("location_id", LOC)
    .eq("status", "concept")
    .limit(1)
    .single();
  if (bErr || !bestelling) return json({ error: "geen concept-bestelling", details: bErr }, 400);

  const { data, error } = await supabase.rpc("__test_bestelmethode_security__", {
    _location_id: LOC,
    _owner_uid: OWNER,
    _kitchen_candidate_uid: KITCHEN,
    _bestelling_id: bestelling.id,
  });

  return json({
    bestelling_id: bestelling.id,
    orig_methode: bestelling.bestelmethode,
    rpc_error: error?.message ?? null,
    results: data,
  });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
