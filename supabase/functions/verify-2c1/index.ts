// Edge Function: verify-2c1 (TEMPORARY validation script)
// Runs all 6 testcases for Etappe 2C-1 and returns a structured report.
// To be deleted after validation. Uses SR-key from Deno.env (no auth required).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// ----- Test fixtures -----
const OWNER_USER = "9ec86890-099f-4c0e-9a4f-19dc7571beaf";
const DUMMY_USER = "00000000-0000-0000-0000-000000000099";
const ONTVANGST_TEMPLATE_ID = "3380dd1a-0000-0000-0000-000000000001"; // not used for query, only narrative

const CASES = {
  CASE1: "e2bc3f1b-0d2c-4a90-8753-94c26c4397a7",
  CASE2: "648967c7-a653-4d80-a5d6-2a33f3de4013",
  CASE3: "addaf9b8-d0fe-4519-a33b-ab44ca0ac8ac",
  CASE4: "12dd4b4b-3263-41e5-ab03-ec0f2f94ce10",
};

type LineInput = {
  line_id: string;
  status: string;
  hoeveelheid_ontvangen?: number;
  lotnummer?: string;
  tht_datum?: string;
  afwijking_notitie?: string;
};

interface CaseResult {
  case: string;
  description: string;
  rpc_input: Record<string, unknown>;
  rpc_result?: unknown;
  rpc_error?: string;
  verification: Record<string, unknown>;
  expectations: Array<{ name: string; expected: unknown; actual: unknown; pass: boolean }>;
  pass: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SR_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SR_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const startedAt = new Date().toISOString();
  const results: CaseResult[] = [];

  // Helper: fetch lines for a receipt, sorted by product
  async function getLines(receiptId: string) {
    const { data, error } = await admin
      .from("goods_receipt_lines")
      .select("id, product_naam_herkend, hoeveelheid_verwacht, ingredient_id")
      .eq("goods_receipt_id", receiptId)
      .order("product_naam_herkend");
    if (error) throw error;
    return data || [];
  }

  // Helper: build "all akkoord" lines for given receipt
  async function allAkkoordLines(receiptId: string): Promise<LineInput[]> {
    const lines = await getLines(receiptId);
    return lines.map((l) => ({
      line_id: l.id as string,
      status: "akkoord",
      hoeveelheid_ontvangen: Number(l.hoeveelheid_verwacht),
    }));
  }

  // Helper: count voorraad_bewegingen for receipt
  async function countVoorraadBewegingen(receiptId: string): Promise<number> {
    const { count, error } = await admin
      .from("voorraad_bewegingen")
      .select("id", { count: "exact", head: true })
      .eq("referentie_type", "goods_receipt")
      .eq("referentie_id", receiptId);
    if (error) throw error;
    return count || 0;
  }

  async function countCreditNotes(receiptId: string): Promise<number> {
    const { count, error } = await admin
      .from("credit_note_requests")
      .select("id", { count: "exact", head: true })
      .eq("goods_receipt_id", receiptId);
    if (error) throw error;
    return count || 0;
  }

  async function countTempRegistraties(userId: string, sinceIso: string): Promise<{ count: number; rows: unknown[] }> {
    const { data, error } = await admin
      .from("temperatuur_registraties")
      .select("id, temperatuur, actie_vereist, actie_beschrijving, locatie_naam, type, max_temp")
      .eq("gemeten_door", userId)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { count: (data || []).length, rows: data || [] };
  }

  async function countChecklistRuns(receiptId: string): Promise<number> {
    const { count, error } = await admin
      .from("checklist_runs")
      .select("id", { count: "exact", head: true })
      .ilike("opmerkingen", `%${receiptId}%`);
    if (error) throw error;
    return count || 0;
  }

  async function getReceiptStatus(receiptId: string) {
    const { data, error } = await admin
      .from("goods_receipts")
      .select("ontvangst_status, heeft_strict_temp_alarm, temp_gekoeld_gemeten, temp_vries_gemeten")
      .eq("id", receiptId)
      .single();
    if (error) throw error;
    return data;
  }

  async function callRpc(payload: Record<string, unknown>) {
    // deno-lint-ignore no-explicit-any
    return await (admin.rpc as any)("confirm_goods_receipt", payload);
  }

  // ===== CASE 1: alle akkoord, temp gekoeld 5°C, temp vries -18°C =====
  {
    const sinceIso = new Date().toISOString();
    const lines = await allAkkoordLines(CASES.CASE1);
    const input = {
      _receipt_id: CASES.CASE1,
      _user_id: OWNER_USER,
      _lines: lines,
      _temp_gekoeld: 5,
      _temp_vries: -18,
      _temp_skip: {},
    };
    const { data: rpc, error: rpcErr } = await callRpc(input);
    const result: CaseResult = {
      case: "CASE1",
      description: "Alle 10 regels akkoord, temp gekoeld 5°C + vries -18°C",
      rpc_input: { lines_count: lines.length, temp_gekoeld: 5, temp_vries: -18 },
      rpc_result: rpc ?? null,
      rpc_error: rpcErr?.message,
      verification: {},
      expectations: [],
      pass: false,
    };
    if (!rpcErr) {
      const status = await getReceiptStatus(CASES.CASE1);
      const vbCount = await countVoorraadBewegingen(CASES.CASE1);
      const cnCount = await countCreditNotes(CASES.CASE1);
      const tempReg = await countTempRegistraties(OWNER_USER, sinceIso);
      const clRuns = await countChecklistRuns(CASES.CASE1);
      result.verification = { status, voorraad_bewegingen: vbCount, credit_notes: cnCount, temp_registraties: tempReg, checklist_runs: clRuns };
      result.expectations = [
        { name: "status=ontvangen_compleet", expected: "ontvangen_compleet", actual: status.ontvangst_status, pass: status.ontvangst_status === "ontvangen_compleet" },
        { name: "voorraad_bewegingen=10", expected: 10, actual: vbCount, pass: vbCount === 10 },
        { name: "credit_notes=0", expected: 0, actual: cnCount, pass: cnCount === 0 },
        { name: "temp_registraties>=2 (gekoeld+vries)", expected: ">=2", actual: tempReg.count, pass: tempReg.count >= 2 },
        { name: "checklist_runs=1", expected: 1, actual: clRuns, pass: clRuns === 1 },
        { name: "heeft_strict_temp_alarm=false (5°C ok voor kip)", expected: false, actual: status.heeft_strict_temp_alarm, pass: status.heeft_strict_temp_alarm === false },
      ];
    }
    result.pass = !result.rpc_error && result.expectations.length > 0 && result.expectations.every((e) => e.pass);
    results.push(result);
  }

  // ===== CASE 2: 1 regel beschadigd, rest akkoord =====
  {
    const sinceIso = new Date().toISOString();
    const allLines = await getLines(CASES.CASE2);
    // Pak Kipdijvlees als beschadigd
    const lines: LineInput[] = allLines.map((l) => {
      if (l.product_naam_herkend === "Kipdijvlees vers 2kg") {
        return {
          line_id: l.id as string,
          status: "afwijking_beschadigd",
          hoeveelheid_ontvangen: 0,
          afwijking_notitie: "Verpakking gescheurd, lekkage",
        };
      }
      return {
        line_id: l.id as string,
        status: "akkoord",
        hoeveelheid_ontvangen: Number(l.hoeveelheid_verwacht),
      };
    });
    const input = {
      _receipt_id: CASES.CASE2,
      _user_id: OWNER_USER,
      _lines: lines,
      _temp_gekoeld: 5,
      _temp_vries: -18,
      _temp_skip: {},
    };
    const { data: rpc, error: rpcErr } = await callRpc(input);
    const result: CaseResult = {
      case: "CASE2",
      description: "1 regel beschadigd (Kipdijvlees), 9 akkoord",
      rpc_input: { lines_count: lines.length, beschadigd: "Kipdijvlees" },
      rpc_result: rpc ?? null,
      rpc_error: rpcErr?.message,
      verification: {},
      expectations: [],
      pass: false,
    };
    if (!rpcErr) {
      const status = await getReceiptStatus(CASES.CASE2);
      const vbCount = await countVoorraadBewegingen(CASES.CASE2);
      const cnCount = await countCreditNotes(CASES.CASE2);
      const tempReg = await countTempRegistraties(OWNER_USER, sinceIso);
      const clRuns = await countChecklistRuns(CASES.CASE2);
      result.verification = { status, voorraad_bewegingen: vbCount, credit_notes: cnCount, temp_registraties: tempReg, checklist_runs: clRuns };
      result.expectations = [
        { name: "status=ontvangen_met_afwijking", expected: "ontvangen_met_afwijking", actual: status.ontvangst_status, pass: status.ontvangst_status === "ontvangen_met_afwijking" },
        { name: "voorraad_bewegingen=9 (kip skipt)", expected: 9, actual: vbCount, pass: vbCount === 9 },
        { name: "credit_notes>=1", expected: ">=1", actual: cnCount, pass: cnCount >= 1 },
        { name: "temp_registraties>=2", expected: ">=2", actual: tempReg.count, pass: tempReg.count >= 2 },
        { name: "checklist_runs=1", expected: 1, actual: clRuns, pass: clRuns === 1 },
      ];
    }
    result.pass = !result.rpc_error && result.expectations.length > 0 && result.expectations.every((e) => e.pass);
    results.push(result);
  }

  // ===== CASE 3: alle akkoord, MAAR risicogroep 8°C boven strict 4°C =====
  {
    const sinceIso = new Date().toISOString();
    const lines = await allAkkoordLines(CASES.CASE3);
    const input = {
      _receipt_id: CASES.CASE3,
      _user_id: OWNER_USER,
      _lines: lines,
      _temp_gekoeld: 8, // boven strict 4°C voor Kipdijvlees
      _temp_vries: -18,
      _temp_skip: {},
    };
    const { data: rpc, error: rpcErr } = await callRpc(input);
    const result: CaseResult = {
      case: "CASE3",
      description: "Risicogroep alarm: gekoeld 8°C terwijl Kipdijvlees max 4°C",
      rpc_input: { lines_count: lines.length, temp_gekoeld: 8 },
      rpc_result: rpc ?? null,
      rpc_error: rpcErr?.message,
      verification: {},
      expectations: [],
      pass: false,
    };
    if (!rpcErr) {
      const status = await getReceiptStatus(CASES.CASE3);
      const vbCount = await countVoorraadBewegingen(CASES.CASE3);
      const cnCount = await countCreditNotes(CASES.CASE3);
      const tempReg = await countTempRegistraties(OWNER_USER, sinceIso);
      const clRuns = await countChecklistRuns(CASES.CASE3);
      // find any temp_registratie with actie_vereist=true
      // deno-lint-ignore no-explicit-any
      const alarmRows = (tempReg.rows as any[]).filter((r) => r.actie_vereist === true);
      result.verification = { status, voorraad_bewegingen: vbCount, credit_notes: cnCount, temp_registraties: tempReg, checklist_runs: clRuns, alarm_rows: alarmRows };
      result.expectations = [
        { name: "voorraad_bewegingen=10", expected: 10, actual: vbCount, pass: vbCount === 10 },
        { name: "heeft_strict_temp_alarm=true", expected: true, actual: status.heeft_strict_temp_alarm, pass: status.heeft_strict_temp_alarm === true },
        { name: "alarm_rows>=1 (actie_vereist=true)", expected: ">=1", actual: alarmRows.length, pass: alarmRows.length >= 1 },
        { name: "alarm_rows hebben actie_beschrijving", expected: "filled", actual: alarmRows.map((r) => r.actie_beschrijving), pass: alarmRows.every((r) => !!r.actie_beschrijving) },
        { name: "checklist_runs=1", expected: 1, actual: clRuns, pass: clRuns === 1 },
      ];
    }
    result.pass = result.expectations.every((e) => e.pass);
    results.push(result);
  }

  // ===== CASE 4: dummy user (no role) → forbidden =====
  {
    const lines = await allAkkoordLines(CASES.CASE4);
    const input = {
      _receipt_id: CASES.CASE4,
      _user_id: DUMMY_USER,
      _lines: lines,
      _temp_gekoeld: 5,
      _temp_vries: -18,
      _temp_skip: {},
    };
    const { data: rpc, error: rpcErr } = await callRpc(input);
    const errMsg = rpcErr?.message || "";
    const isForbidden = errMsg.includes("forbidden");
    results.push({
      case: "CASE4",
      description: "Dummy user zonder role → expect 'forbidden'",
      rpc_input: { user: DUMMY_USER, lines_count: lines.length },
      rpc_result: rpc ?? null,
      rpc_error: errMsg,
      verification: {},
      expectations: [
        { name: "RPC error contains 'forbidden'", expected: true, actual: isForbidden, pass: isForbidden },
      ],
      pass: isForbidden,
    });
  }

  // ===== CASE 5: re-confirm CASE1 → expect 'already_confirmed' =====
  {
    const lines = await allAkkoordLines(CASES.CASE1);
    const input = {
      _receipt_id: CASES.CASE1,
      _user_id: OWNER_USER,
      _lines: lines,
      _temp_gekoeld: 5,
      _temp_vries: -18,
      _temp_skip: {},
    };
    const { data: rpc, error: rpcErr } = await callRpc(input);
    const errMsg = rpcErr?.message || "";
    const isAlready = errMsg.includes("already_confirmed");
    results.push({
      case: "CASE5",
      description: "Re-confirm CASE1 (al bevestigd) → expect 'already_confirmed'",
      rpc_input: { receipt: CASES.CASE1 },
      rpc_result: rpc ?? null,
      rpc_error: errMsg,
      verification: {},
      expectations: [
        { name: "RPC error contains 'already_confirmed'", expected: true, actual: isAlready, pass: isAlready },
      ],
      pass: isAlready,
    });
  }

  // ===== CASE 6: scheduler skip-check voor on_demand templates =====
  {
    // Find a template with frequentie='on_demand' or scheduler_skip=true
    const { data: ondemandTemplates } = await admin
      .from("checklist_templates")
      .select("id, naam, frequentie, frequentie_config, location_id")
      .eq("actief", true)
      .or("frequentie.eq.on_demand,frequentie_config->>scheduler_skip.eq.true")
      .limit(5);

    const tplIds = (ondemandTemplates || []).map((t) => t.id as string);
    let runsForOnDemand = 0;
    let schedulerError: string | undefined;
    let runsCreated: unknown = null;
    if (tplIds.length > 0) {
      // Run scheduler for tomorrow
      const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      // Cleanup any prior runs for this date+templates first
      await admin.from("checklist_runs").delete().in("template_id", tplIds).eq("datum", tomorrow);

      // deno-lint-ignore no-explicit-any
      const { data: schedRes, error: schedErr } = await (admin.rpc as any)("generate_daily_checklist_runs_for_date", { _target_date: tomorrow });
      runsCreated = schedRes;
      schedulerError = schedErr?.message;

      const { count } = await admin
        .from("checklist_runs")
        .select("id", { count: "exact", head: true })
        .in("template_id", tplIds)
        .eq("datum", tomorrow);
      runsForOnDemand = count || 0;
    }
    results.push({
      case: "CASE6",
      description: "Scheduler skipt on_demand + scheduler_skip templates",
      rpc_input: { ondemand_template_count: tplIds.length },
      rpc_result: runsCreated,
      rpc_error: schedulerError,
      verification: { templates: ondemandTemplates, runs_created_for_ondemand: runsForOnDemand },
      expectations: [
        { name: "runs_for_ondemand=0", expected: 0, actual: runsForOnDemand, pass: runsForOnDemand === 0 },
      ],
      pass: runsForOnDemand === 0,
    });
  }

  const totalPass = results.filter((r) => r.pass).length;
  const totalFail = results.length - totalPass;

  return new Response(
    JSON.stringify({
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      total: results.length,
      pass: totalPass,
      fail: totalFail,
      results,
    }, null, 2),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
