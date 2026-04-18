// Test-only edge function. Voert de B/C/D-verificatie uit met service-role:
// - simuleert auth.uid() via set_config('request.jwt.claims', ...) binnen één DB-sessie
// - test trigger guard_bestelmethode_change voor kitchen vs owner/manager/finance
// - test audit-trail
// Cleanup gebeurt aan het eind. Is bedoeld om handmatig (curl) te triggeren en
// daarna verwijderd te worden.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOC = "22222222-2222-2222-2222-222222222222";
const OWNER = "452a65e8-75b7-4cd1-9736-66835823382e";
const KITCHEN_CANDIDATE = "44477838-6bf6-4f91-81b4-fe459b58a484";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const results: any = { steps: [] };
  const log = (step: string, status: "PASS" | "FAIL" | "INFO", detail: any) => {
    results.steps.push({ step, status, detail });
    console.log(`[${status}] ${step}:`, JSON.stringify(detail));
  };

  try {
    // Setup: maak test-bestelling die we mogen muteren (in concept-status)
    const { data: bestelling, error: bErr } = await supabase
      .from("bestellingen")
      .select("id, bestelmethode, status, location_id")
      .eq("location_id", LOC)
      .eq("status", "concept")
      .limit(1)
      .single();
    if (bErr) throw new Error(`Geen test-bestelling: ${bErr.message}`);
    const BESTELLING_ID = bestelling.id;
    const ORIG_METHODE = bestelling.bestelmethode;
    log("setup.fetch_bestelling", "INFO", { id: BESTELLING_ID, methode: ORIG_METHODE });

    // Setup: kitchen-rol toevoegen (UPSERT-ish via direct insert + cleanup later)
    const { error: kErr } = await supabase
      .from("user_location_roles")
      .upsert({ user_id: KITCHEN_CANDIDATE, location_id: LOC, role: "kitchen" }, { onConflict: "user_id,location_id" });
    if (kErr) throw new Error(`kitchen-rol setup: ${kErr.message}`);
    log("setup.kitchen_role", "PASS", { user: KITCHEN_CANDIDATE, role: "kitchen" });

    const ORIG_OWNER_ROLE = "owner"; // we weten dat OWNER al owner is

    // ─── TEST B: kitchen probeert bestelmethode te wijzigen ────────────────
    // We gebruiken raw SQL via een RPC die we tijdelijk maken? Nee — supabase-js
    // ondersteunt geen 'set jwt.claims' per request. We doen dit via een
    // SECURITY DEFINER helper die we *al* hebben? Nee, die hebben we niet.
    //
    // Alternatief: roep direct de trigger-functie na via een test-RPC. Maar de
    // trigger leest auth.uid() — service-role context geeft NULL → dan zou élke
    // wijziging blokkeren wat verkeerd-positief is.
    //
    // Beste aanpak: gebruik `pg_net` style? Nee. Beste: maak een tijdelijke
    // SQL-functie die binnen één transactie set_config + UPDATE doet en
    // exception-result returnt.
    const testSql = `
      DO $test$
      DECLARE
        _err text;
        _new_methode bestel_methode;
        _audit_count int;
      BEGIN
        -- B: kitchen
        BEGIN
          PERFORM set_config('request.jwt.claims',
            json_build_object('sub','${KITCHEN_CANDIDATE}','role','authenticated')::text,
            true);
          UPDATE bestellingen SET bestelmethode='handmatig' WHERE id='${BESTELLING_ID}';
          RAISE NOTICE 'TEST_B_RESULT: NO_ERROR (FAIL — kitchen kon wijzigen)';
        EXCEPTION WHEN insufficient_privilege THEN
          RAISE NOTICE 'TEST_B_RESULT: BLOCKED_42501 (PASS)';
        WHEN OTHERS THEN
          GET STACKED DIAGNOSTICS _err = MESSAGE_TEXT;
          RAISE NOTICE 'TEST_B_RESULT: OTHER_ERROR % (FAIL)', _err;
        END;

        -- C: owner
        BEGIN
          PERFORM set_config('request.jwt.claims',
            json_build_object('sub','${OWNER}','role','authenticated')::text,
            true);
          UPDATE bestellingen SET bestelmethode='handmatig' WHERE id='${BESTELLING_ID}';
          SELECT bestelmethode INTO _new_methode FROM bestellingen WHERE id='${BESTELLING_ID}';
          IF _new_methode = 'handmatig' THEN
            RAISE NOTICE 'TEST_C_RESULT: UPDATED_TO_% (PASS)', _new_methode;
          ELSE
            RAISE NOTICE 'TEST_C_RESULT: NOT_UPDATED_% (FAIL)', _new_methode;
          END IF;
        EXCEPTION WHEN OTHERS THEN
          GET STACKED DIAGNOSTICS _err = MESSAGE_TEXT;
          RAISE NOTICE 'TEST_C_RESULT: ERROR % (FAIL)', _err;
        END;

        -- D: audit-log entry
        SELECT count(*) INTO _audit_count FROM audit_log
        WHERE entity_type='bestellingen' AND entity_id='${BESTELLING_ID}'
          AND action='bestelmethode_changed' AND actor_id='${OWNER}';
        IF _audit_count >= 1 THEN
          RAISE NOTICE 'TEST_D_RESULT: AUDIT_ENTRY_FOUND_% (PASS)', _audit_count;
        ELSE
          RAISE NOTICE 'TEST_D_RESULT: NO_AUDIT_ENTRY (FAIL)';
        END IF;

        -- Restore
        BEGIN
          PERFORM set_config('request.jwt.claims',
            json_build_object('sub','${OWNER}','role','authenticated')::text,
            true);
          UPDATE bestellingen SET bestelmethode='${ORIG_METHODE}' WHERE id='${BESTELLING_ID}';
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
      END
      $test$;
    `;

    // Voer via een tijdelijke RPC: we gebruiken pg-meta? Niet beschikbaar.
    // We doen het via een ad-hoc SQL functie aanmaken, aanroepen, droppen.
    const { error: createErr } = await supabase.rpc("exec_test_sql_bestelmethode" as any, {});
    if (createErr && !createErr.message.includes("does not exist")) {
      log("rpc.exec", "FAIL", createErr.message);
    }

    // Pad B: kunnen we het via fetch direct naar postgrest? Nee. Doe het via
    // een eenmalige migratie-stijl: maak hulp-functie via SQL execution. Maar
    // supabase-js heeft geen .sql() raw. We hebben dus écht een DB-functie
    // nodig die deze test draait.
    log("approach", "INFO", "Edge function kan geen raw DDL/DO uitvoeren via supabase-js. Vereist hulp-RPC of psql-superuser.");

    // ─── Cleanup ───────────────────────────────────────────────────────────
    await supabase
      .from("user_location_roles")
      .delete()
      .eq("user_id", KITCHEN_CANDIDATE)
      .eq("location_id", LOC);
    log("cleanup.kitchen_role", "PASS", "removed");

    return new Response(JSON.stringify(results, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    log("fatal", "FAIL", e instanceof Error ? e.message : String(e));
    return new Response(JSON.stringify(results, null, 2), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
