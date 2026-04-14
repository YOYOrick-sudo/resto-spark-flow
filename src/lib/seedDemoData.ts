import { supabase } from "@/integrations/supabase/client";

// ── Known seed names for cleanup ───────────────────────────────
const SEED_LEVERANCIER_NAMES = ["Kooyman Grootverbruik", "Bidfood"];
const SEED_INGREDIENT_NAMES = [
  "Kipfilet", "Zalm vers", "Tomaten", "Uien", "Knoflook",
  "Olijfolie extra vierge", "Slagroom", "Boter", "Pasta penne",
  "Bloem patent", "Eieren (doos 30st)", "Parmezaanse kaas",
  "Basilicum vers", "Citroenen", "Rundvlees entrecote",
];
const SEED_RECEPT_NAMES = [
  "Tomatenrelish", "Zalmgravad", "Pasta aglio e olio basis",
  "Kruidenboter", "Kippensoep",
];
const SEED_GERECHT_NAMES = [
  "Pasta Aglio e Olio", "Gegrilde Entrecote", "Zalmgravad voorgerecht",
];

// ── Types ──────────────────────────────────────────────────────
interface SeedResult {
  success: boolean;
  message: string;
  created?: {
    leveranciers: number;
    ingredienten: number;
    recepten: number;
    gerechten: number;
    mepTaken: number;
    voorraadBewegingen: number;
  };
}

// ── Delete demo data ───────────────────────────────────────────
export async function deleteDemoData(locationId: string): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Get IDs for cascading deletes
    const { data: ingredienten } = await supabase
      .from("ingredienten").select("id").eq("location_id", locationId)
      .in("naam", SEED_INGREDIENT_NAMES);
    const ingIds = (ingredienten ?? []).map(i => i.id);

    const { data: recepten } = await supabase
      .from("recepten").select("id").eq("location_id", locationId)
      .in("naam", SEED_RECEPT_NAMES);
    const recIds = (recepten ?? []).map(r => r.id);

    const { data: gerechten } = await supabase
      .from("gerechten").select("id").eq("location_id", locationId)
      .in("naam", SEED_GERECHT_NAMES);
    const gerIds = (gerechten ?? []).map(g => g.id);

    // 2. Delete in reverse dependency order
    if (ingIds.length > 0) {
      await supabase.from("voorraad_bewegingen").delete().in("ingredient_id", ingIds);
    }

    if (recIds.length > 0) {
      // mep_task_completions via mep_tasks
      const { data: mepTasks } = await supabase
        .from("mep_tasks").select("id").eq("location_id", locationId)
        .in("recept_id", recIds);
      const mepIds = (mepTasks ?? []).map(m => m.id);
      if (mepIds.length > 0) {
        await supabase.from("mep_task_completions").delete().in("task_id", mepIds);
      }
      await supabase.from("mep_tasks").delete().eq("location_id", locationId).in("recept_id", recIds);
    }

    if (gerIds.length > 0) {
      await supabase.from("gerecht_componenten").delete().in("gerecht_id", gerIds);
      await supabase.from("gerechten").delete().in("id", gerIds);
    }

    if (recIds.length > 0) {
      await supabase.from("recept_ingredienten").delete().in("recept_id", recIds);
      await supabase.from("halffabricaat_methodes").delete().in("recept_id", recIds);
      await supabase.from("recepten").delete().in("id", recIds);
    }

    if (ingIds.length > 0) {
      await supabase.from("ingredient_allergenen").delete().in("ingredient_id", ingIds);
      await supabase.from("ingredienten").delete().in("id", ingIds);
    }

    await supabase.from("leveranciers").delete().eq("location_id", locationId)
      .in("naam", SEED_LEVERANCIER_NAMES);

    return { success: true, message: "Demo data verwijderd." };
  } catch (error: any) {
    return { success: false, message: error.message || "Fout bij verwijderen demo data." };
  }
}

// ── Check if seed data exists ──────────────────────────────────
export async function checkSeedDataExists(locationId: string): Promise<boolean> {
  const { data: lev } = await supabase.from("leveranciers").select("id")
    .eq("location_id", locationId).eq("naam", "Kooyman Grootverbruik").maybeSingle();
  if (lev) return true;
  const { data: rec } = await supabase.from("recepten").select("id")
    .eq("location_id", locationId).eq("naam", "Tomatenrelish").maybeSingle();
  if (rec) return true;
  const { data: ing } = await supabase.from("ingredienten").select("id")
    .eq("location_id", locationId).eq("naam", "Kipfilet").maybeSingle();
  return !!ing;
}

// ── Main seed function ─────────────────────────────────────────
export async function seedDemoData(locationId: string): Promise<SeedResult> {
  // Idempotency: check if any seed data already exists
  const exists = await checkSeedDataExists(locationId);
  if (exists) {
    return { success: false, message: "Demo data bestaat al. Verwijder eerst de bestaande data." };
  }

  try {
    // ═══════════════════════════════════════════════════════════
    // 1. LEVERANCIERS
    // ═══════════════════════════════════════════════════════════
    const { data: leveranciers, error: levErr } = await supabase
      .from("leveranciers")
      .insert([
        {
          location_id: locationId,
          naam: "Kooyman Grootverbruik",
          contactpersoon: "Mark Kooyman",
          email: "info@kooymangv.nl",
          telefoon: "0517-123456",
          type: "wholesaler",
          koppeling_type: "handmatig",
        },
        {
          location_id: locationId,
          naam: "Bidfood",
          contactpersoon: "Klantenservice",
          email: "orders@bidfood.nl",
          telefoon: "088-2707000",
          type: "wholesaler",
          koppeling_type: "handmatig",
        },
      ])
      .select("id, naam");
    if (levErr) throw new Error(`Leveranciers: ${levErr.message}`);

    const levMap = Object.fromEntries(
      (leveranciers ?? []).map((l) => [l.naam, l.id])
    );

    // ═══════════════════════════════════════════════════════════
    // 2. INGREDIËNTEN
    // ═══════════════════════════════════════════════════════════
    const ingredientData = [
      { naam: "Kipfilet", categorie: "Vlees", eenheid: "kg", kostprijs: 8.5, yield_percentage: 95, voorraad: 4.5, min_voorraad: 3, opslag_type: "koeling", lev: "Kooyman Grootverbruik" },
      { naam: "Zalm vers", categorie: "Vis", eenheid: "kg", kostprijs: 22, yield_percentage: 85, voorraad: 2, min_voorraad: 1.5, opslag_type: "koeling", lev: "Bidfood" },
      { naam: "Tomaten", categorie: "Groenten", eenheid: "kg", kostprijs: 2.8, yield_percentage: 90, voorraad: 8, min_voorraad: 5, opslag_type: "koeling", lev: "Kooyman Grootverbruik" },
      { naam: "Uien", categorie: "Groenten", eenheid: "kg", kostprijs: 1.2, yield_percentage: 88, voorraad: 10, min_voorraad: 5, opslag_type: "droog", lev: "Kooyman Grootverbruik" },
      { naam: "Knoflook", categorie: "Groenten", eenheid: "kg", kostprijs: 6.5, yield_percentage: 85, voorraad: 1.5, min_voorraad: 1, opslag_type: "droog", lev: "Bidfood" },
      { naam: "Olijfolie extra vierge", categorie: "Olie & Vetten", eenheid: "L", kostprijs: 8.9, yield_percentage: 100, voorraad: 5, min_voorraad: 3, opslag_type: "droog", lev: "Bidfood" },
      { naam: "Slagroom", categorie: "Zuivel", eenheid: "L", kostprijs: 4.2, yield_percentage: 100, voorraad: 3, min_voorraad: 2, opslag_type: "koeling", lev: "Kooyman Grootverbruik" },
      { naam: "Boter", categorie: "Zuivel", eenheid: "kg", kostprijs: 7.5, yield_percentage: 100, voorraad: 2, min_voorraad: 1.5, opslag_type: "koeling", lev: "Kooyman Grootverbruik" },
      { naam: "Pasta penne", categorie: "Droog & Conserven", eenheid: "kg", kostprijs: 1.9, yield_percentage: 100, voorraad: 8, min_voorraad: 5, opslag_type: "droog", lev: "Bidfood" },
      { naam: "Bloem patent", categorie: "Droog & Conserven", eenheid: "kg", kostprijs: 0.85, yield_percentage: 100, voorraad: 10, min_voorraad: 5, opslag_type: "droog", lev: "Bidfood" },
      { naam: "Eieren (doos 30st)", categorie: "Zuivel", eenheid: "st", kostprijs: 0.18, yield_percentage: 100, voorraad: 60, min_voorraad: 30, opslag_type: "koeling", lev: "Kooyman Grootverbruik" },
      { naam: "Parmezaanse kaas", categorie: "Zuivel", eenheid: "kg", kostprijs: 18.5, yield_percentage: 95, voorraad: 1, min_voorraad: 0.5, opslag_type: "koeling", lev: "Bidfood" },
      { naam: "Basilicum vers", categorie: "Kruiden & Specerijen", eenheid: "kg", kostprijs: 25, yield_percentage: 70, voorraad: 0.3, min_voorraad: 0.2, opslag_type: "koeling", lev: "Kooyman Grootverbruik" },
      { naam: "Citroenen", categorie: "Groenten", eenheid: "kg", kostprijs: 3.2, yield_percentage: 75, voorraad: 2, min_voorraad: 1, opslag_type: "koeling", lev: "Bidfood" },
      { naam: "Rundvlees entrecote", categorie: "Vlees", eenheid: "kg", kostprijs: 28, yield_percentage: 92, voorraad: 3, min_voorraad: 2, opslag_type: "koeling", lev: "Kooyman Grootverbruik" },
    ];

    const { data: ingredienten, error: ingErr } = await supabase
      .from("ingredienten")
      .insert(
        ingredientData.map((i) => ({
          location_id: locationId,
          naam: i.naam,
          categorie: i.categorie,
          eenheid: i.eenheid,
          kostprijs: i.kostprijs,
          kostprijs_bron: "handmatig",
          kostprijs_laatst_bijgewerkt: new Date().toISOString(),
          yield_percentage: i.yield_percentage,
          voorraad: i.voorraad,
          min_voorraad: i.min_voorraad,
          opslag_type: i.opslag_type,
        }))
      )
      .select("id, naam");
    if (ingErr) throw new Error(`Ingrediënten: ${ingErr.message}`);

    const ingMap = Object.fromEntries(
      (ingredienten ?? []).map((i) => [i.naam, i.id])
    );

    // ═══════════════════════════════════════════════════════════
    // 3. ALLERGENEN
    // ═══════════════════════════════════════════════════════════
    const { data: allergenen } = await supabase
      .from("allergenen")
      .select("id, code")
      .order("sort_order");

    if (allergenen && allergenen.length > 0) {
      const allergeenMap = Object.fromEntries(
        allergenen.map((a) => [a.code, a.id])
      );

      // Define allergen statuses per ingredient
      type AllergenDef = { bevat?: string[]; kan_bevatten?: string[]; };
      const allergenConfig: Record<string, AllergenDef> = {
        "Zalm vers": { bevat: ["VIS"] },
        "Pasta penne": { bevat: ["GLU", "EI"], kan_bevatten: ["SOJ"] },
        "Bloem patent": { bevat: ["GLU"] },
        "Eieren (doos 30st)": { bevat: ["EI"] },
        "Slagroom": { bevat: ["MEL"] },
        "Boter": { bevat: ["MEL"] },
        "Parmezaanse kaas": { bevat: ["MEL"] },
      };

      // Ingredients without specific allergens → all "geen"
      const allIngredientNames = ingredientData.map((i) => i.naam);
      const records: { ingredient_id: string; allergeen_id: string; status: string; bron: string }[] = [];

      for (const ingName of allIngredientNames) {
        const ingId = ingMap[ingName];
        if (!ingId) continue;

        const config = allergenConfig[ingName];

        for (const allergen of allergenen) {
          let status = "geen";
          if (config?.bevat?.includes(allergen.code)) {
            status = "bevat";
          } else if (config?.kan_bevatten?.includes(allergen.code)) {
            status = "kan_bevatten";
          } else if (!config) {
            // Ingredients not in allergenConfig: all "geen"
            status = "geen";
          }
          records.push({
            ingredient_id: ingId,
            allergeen_id: allergen.id,
            status,
            bron: "handmatig",
          });
        }
      }

      if (records.length > 0) {
        const { error: algErr } = await supabase
          .from("ingredient_allergenen")
          .insert(records);
        if (algErr) throw new Error(`Allergenen: ${algErr.message}`);
      }
    }

    // ═══════════════════════════════════════════════════════════
    // 4. RECEPTEN + INGREDIËNTEN + METHODES
    // ═══════════════════════════════════════════════════════════
    const receptenDefs = [
      {
        naam: "Tomatenrelish",
        categorie: "Sauzen",
        type: "halffabricaat",
        porties: 10,
        actieve_bereidingstijd: 25,
        passieve_bereidingstijd: 0,
        bereiding: "1. Snijd de tomaten in blokjes.\n2. Snipper de uien en knoflook.\n3. Fruit de uien in olijfolie tot glazig.\n4. Voeg knoflook en tomaten toe.\n5. Laat 15 minuten inkoken op laag vuur.\n6. Voeg basilicum toe en breng op smaak.",
        ingredienten: [
          { naam: "Tomaten", hoeveelheid: 2, eenheid: "kg" },
          { naam: "Uien", hoeveelheid: 0.5, eenheid: "kg" },
          { naam: "Knoflook", hoeveelheid: 0.1, eenheid: "kg" },
          { naam: "Olijfolie extra vierge", hoeveelheid: 0.1, eenheid: "L" },
          { naam: "Basilicum vers", hoeveelheid: 0.05, eenheid: "kg" },
        ],
        methode: { type: "Bereiden", output_hoeveelheid: 1.5, output_eenheid: "kg", visuele_eenheid: "1 GN 1/3", standaard_duur: 25, houdbaarheid: 3 },
      },
      {
        naam: "Zalmgravad",
        categorie: "Vis",
        type: "halffabricaat",
        porties: 8,
        actieve_bereidingstijd: 15,
        passieve_bereidingstijd: 1440,
        bereiding: "1. Filet de zalm en verwijder graten.\n2. Rasp de citroenschil.\n3. Meng zout, suiker en citroenzest.\n4. Bestrooi de zalm en wikkel in folie.\n5. Laat 24 uur marineren in de koeling.",
        ingredienten: [
          { naam: "Zalm vers", hoeveelheid: 1, eenheid: "kg" },
          { naam: "Citroenen", hoeveelheid: 0.2, eenheid: "kg" },
        ],
        methode: { type: "Bereiden", output_hoeveelheid: 0.9, output_eenheid: "kg", visuele_eenheid: "1 vershoudfolie-pakket", standaard_duur: 15, houdbaarheid: 5 },
      },
      {
        naam: "Pasta aglio e olio basis",
        categorie: "Pasta",
        type: "halffabricaat",
        porties: 4,
        actieve_bereidingstijd: 15,
        passieve_bereidingstijd: null,
        bereiding: "1. Kook de pasta al dente.\n2. Snijd knoflook in dunne plakjes.\n3. Fruit knoflook in olijfolie op laag vuur.\n4. Meng de pasta door de knoflookolie.\n5. Rasp parmezaan erover.",
        ingredienten: [
          { naam: "Pasta penne", hoeveelheid: 0.5, eenheid: "kg" },
          { naam: "Knoflook", hoeveelheid: 0.05, eenheid: "kg" },
          { naam: "Olijfolie extra vierge", hoeveelheid: 0.08, eenheid: "L" },
          { naam: "Parmezaanse kaas", hoeveelheid: 0.1, eenheid: "kg" },
        ],
        methode: { type: "Bereiden", output_hoeveelheid: 0.7, output_eenheid: "kg", visuele_eenheid: "1 pan", standaard_duur: 15, houdbaarheid: 1 },
      },
      {
        naam: "Kruidenboter",
        categorie: "Sauzen",
        type: "halffabricaat",
        porties: 20,
        actieve_bereidingstijd: 10,
        passieve_bereidingstijd: null,
        bereiding: "1. Laat de boter op kamertemperatuur komen.\n2. Pers de knoflook en hak de basilicum fijn.\n3. Meng alles met citroensap.\n4. Rol in folie en zet koud.",
        ingredienten: [
          { naam: "Boter", hoeveelheid: 0.5, eenheid: "kg" },
          { naam: "Knoflook", hoeveelheid: 0.03, eenheid: "kg" },
          { naam: "Basilicum vers", hoeveelheid: 0.02, eenheid: "kg" },
          { naam: "Citroenen", hoeveelheid: 0.05, eenheid: "kg" },
        ],
        methode: { type: "Bereiden", output_hoeveelheid: 0.5, output_eenheid: "kg", visuele_eenheid: "1 rol", standaard_duur: 10, houdbaarheid: 7 },
      },
      {
        naam: "Kippensoep",
        categorie: "Soepen",
        type: "halffabricaat",
        porties: 8,
        actieve_bereidingstijd: 20,
        passieve_bereidingstijd: 45,
        bereiding: "1. Snijd de kip in blokjes.\n2. Fruit de uien in boter.\n3. Voeg de kip toe en bak aan.\n4. Voeg 1L water toe en kook 45 min.\n5. Voeg slagroom toe en mix glad.",
        ingredienten: [
          { naam: "Kipfilet", hoeveelheid: 0.6, eenheid: "kg" },
          { naam: "Uien", hoeveelheid: 0.3, eenheid: "kg" },
          { naam: "Boter", hoeveelheid: 0.05, eenheid: "kg" },
          { naam: "Slagroom", hoeveelheid: 0.2, eenheid: "L" },
        ],
        methode: { type: "Bereiden", output_hoeveelheid: 1.8, output_eenheid: "L", visuele_eenheid: "1 soeppan", standaard_duur: 65, houdbaarheid: 2 },
      },
    ];

    const receptMap: Record<string, string> = {};
    const methodeMap: Record<string, string> = {};

    for (let ri = 0; ri < receptenDefs.length; ri++) {
      const r = receptenDefs[ri];

      const { data: recept, error: recErr } = await supabase
        .from("recepten")
        .insert({
          location_id: locationId,
          naam: r.naam,
          categorie: r.categorie,
          type: r.type,
          porties: r.porties,
          actieve_bereidingstijd: r.actieve_bereidingstijd,
          passieve_bereidingstijd: r.passieve_bereidingstijd ?? null,
          bereiding: r.bereiding,
        })
        .select("id")
        .single();
      if (recErr) throw new Error(`Recept ${r.naam}: ${recErr.message}`);
      receptMap[r.naam] = recept.id;

      // Add ingredients
      const recIngredients = r.ingredienten.map((ing, idx) => ({
        recept_id: recept.id,
        ingredient_id: ingMap[ing.naam],
        hoeveelheid: ing.hoeveelheid,
        eenheid: ing.eenheid,
        sort_order: idx + 1,
      }));

      const { error: riErr } = await supabase
        .from("recept_ingredienten")
        .insert(recIngredients);
      if (riErr) throw new Error(`Recept ingrediënten ${r.naam}: ${riErr.message}`);

      // Add method
      const { data: methode, error: mErr } = await supabase
        .from("halffabricaat_methodes")
        .insert({
          recept_id: recept.id,
          type: r.methode.type,
          output_hoeveelheid: r.methode.output_hoeveelheid,
          output_eenheid: r.methode.output_eenheid,
          visuele_eenheid: r.methode.visuele_eenheid,
          standaard_duur: r.methode.standaard_duur,
          houdbaarheid: r.methode.houdbaarheid,
          sort_order: 1,
        })
        .select("id")
        .single();
      if (mErr) throw new Error(`Methode ${r.naam}: ${mErr.message}`);
      methodeMap[r.naam] = methode.id;

      // Calculate kostprijs
      let totaleIngredientkostprijs = 0;
      for (const ing of r.ingredienten) {
        const ingData = ingredientData.find((i) => i.naam === ing.naam);
        if (ingData) {
          const effectieveKostprijs = ingData.kostprijs / (ingData.yield_percentage / 100);
          totaleIngredientkostprijs += ing.hoeveelheid * effectieveKostprijs;
        }
      }

      const totaleKostprijs = totaleIngredientkostprijs;
      const kostprijsPerPortie = totaleKostprijs / r.porties;

      await supabase
        .from("recepten")
        .update({
          totale_ingredientkostprijs: totaleIngredientkostprijs,
          arbeidskostprijs: 0,
          totale_kostprijs: totaleKostprijs,
          kostprijs_per_portie: kostprijsPerPortie,
          kostprijs_berekend_op: new Date().toISOString(),
        })
        .eq("id", recept.id);
    }

    // ═══════════════════════════════════════════════════════════
    // 5. GERECHTEN + COMPONENTEN
    // ═══════════════════════════════════════════════════════════
    const gerechtenDefs = [
      {
        naam: "Pasta Aglio e Olio",
        categorie: "Hoofdgerechten",
        verkoopprijs: 16.5,
        bereidingswijze: "Verwarm de pasta basis. Serveer op een voorverwarmd bord met extra parmezaan en verse basilicum.",
        componenten: [
          { type: "halffabricaat", recept: "Pasta aglio e olio basis", hoeveelheid: 1, eenheid: "portie" },
        ],
      },
      {
        naam: "Gegrilde Entrecote",
        categorie: "Hoofdgerechten",
        verkoopprijs: 28.5,
        bereidingswijze: "1. Haal de entrecote op kamertemperatuur.\n2. Grill 3 min per kant op hoog vuur.\n3. Laat 5 min rusten.\n4. Serveer met een schijf kruidenboter en tomatenrelish.",
        componenten: [
          { type: "ingredient", ingredient: "Rundvlees entrecote", hoeveelheid: 0.25, eenheid: "kg" },
          { type: "halffabricaat", recept: "Kruidenboter", hoeveelheid: 1, eenheid: "portie" },
          { type: "halffabricaat", recept: "Tomatenrelish", hoeveelheid: 1, eenheid: "portie" },
        ],
      },
      {
        naam: "Zalmgravad voorgerecht",
        categorie: "Voorgerechten",
        verkoopprijs: 14.5,
        bereidingswijze: "Snijd de gravad in dunne plakken. Serveer op een gekoeld bord met citroen, dille en toast.",
        componenten: [
          { type: "halffabricaat", recept: "Zalmgravad", hoeveelheid: 1, eenheid: "portie" },
        ],
      },
    ];

    let gerechtenCount = 0;
    for (const g of gerechtenDefs) {
      const { data: gerecht, error: gErr } = await supabase
        .from("gerechten")
        .insert({
          location_id: locationId,
          naam: g.naam,
          categorie: g.categorie,
          verkoopprijs: g.verkoopprijs,
          bereidingswijze: g.bereidingswijze,
        } as any)
        .select("id")
        .single();
      if (gErr) throw new Error(`Gerecht ${g.naam}: ${gErr.message}`);
      gerechtenCount++;

      for (const comp of g.componenten) {
        const insertData: any = {
          gerecht_id: gerecht.id,
          type: comp.type,
          hoeveelheid: comp.hoeveelheid,
          eenheid: comp.eenheid,
        };

        if (comp.type === "halffabricaat" && comp.recept) {
          insertData.recept_id = receptMap[comp.recept];
        }
        if (comp.type === "ingredient" && (comp as any).ingredient) {
          insertData.ingredient_id = ingMap[(comp as any).ingredient];
        }

        await supabase.from("gerecht_componenten").insert(insertData as any);
      }
    }

    // ═══════════════════════════════════════════════════════════
    // 6. MEP TAKEN
    // ═══════════════════════════════════════════════════════════
    const today = new Date().toISOString().split("T")[0];

    const mepDefs = [
      { title: "Tomatenrelish maken", recept: "Tomatenrelish", status: "pending", prioriteit: "Normaal", units: 2, deadline: `${today}T11:00:00`, category: "Sauzen" },
      { title: "Kippensoep koken", recept: "Kippensoep", status: "pending", prioriteit: "Hoog", units: 1, deadline: `${today}T10:30:00`, category: "Soepen" },
      { title: "Kruidenboter rollen", recept: "Kruidenboter", status: "completed", prioriteit: "Normaal", units: 1, deadline: null, category: "Sauzen" },
      { title: "Pasta basis voorbereiden", recept: "Pasta aglio e olio basis", status: "in_progress", prioriteit: "Normaal", units: 3, deadline: `${today}T16:00:00`, category: "Pasta" },
      { title: "Zalmgravad controleren", recept: "Zalmgravad", status: "pending", prioriteit: "Normaal", units: 1, deadline: `${today}T12:00:00`, category: "Vis" },
    ];

    const mepInserts = mepDefs.map((t) => ({
      location_id: locationId,
      title: t.title,
      category: t.category,
      task_date: today,
      recept_id: receptMap[t.recept] || null,
      methode_id: methodeMap[t.recept] || null,
      status: t.status,
      prioriteit: t.prioriteit,
      units: t.units,
      deadline: t.deadline,
    }));

    const { data: mepTasks, error: mepErr } = await supabase
      .from("mep_tasks")
      .insert(mepInserts)
      .select("id, title, status");
    if (mepErr) throw new Error(`MEP taken: ${mepErr.message}`);

    // Completion for Kruidenboter
    const completedTask = (mepTasks ?? []).find((t) => t.status === "completed");
    if (completedTask) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("mep_task_completions").insert({
          task_id: completedTask.id,
          medewerker_id: user.id,
          units_gemaakt: 1,
          werkelijke_output_gram: 500,
        } as any);
      }
    }

    // ═══════════════════════════════════════════════════════════
    // 7. VOORRAAD BEWEGINGEN
    // ═══════════════════════════════════════════════════════════
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const twoDaysAgo = new Date(Date.now() - 172800000).toISOString();

    const bewegingen = [
      { ingredient: "Kipfilet", type: "IN", hoeveelheid: 5, bron: "Levering Kooyman", opmerking: "Standaard levering", created_at: yesterday },
      { ingredient: "Tomaten", type: "IN", hoeveelheid: 10, bron: "Levering Kooyman", opmerking: "Standaard levering", created_at: yesterday },
      { ingredient: "Zalm vers", type: "IN", hoeveelheid: 3, bron: "Levering Bidfood", opmerking: "Weekbestelling", created_at: twoDaysAgo },
      { ingredient: "Kipfilet", type: "OUT", hoeveelheid: -0.6, bron: "Productie Kippensoep", opmerking: null, created_at: new Date().toISOString() },
      { ingredient: "Slagroom", type: "WASTE", hoeveelheid: -0.5, bron: "Bederf", opmerking: "Over datum", created_at: yesterday },
    ];

    const bewegingenInserts = bewegingen.map((b) => ({
      ingredient_id: ingMap[b.ingredient],
      type: b.type,
      hoeveelheid: b.hoeveelheid,
      bron: b.bron,
      opmerking: b.opmerking,
      created_at: b.created_at,
    }));

    const { error: bewErr } = await supabase
      .from("voorraad_bewegingen")
      .insert(bewegingenInserts);
    if (bewErr) throw new Error(`Voorraad bewegingen: ${bewErr.message}`);

    return {
      success: true,
      message: "Demo data succesvol aangemaakt!",
      created: {
        leveranciers: 2,
        ingredienten: ingredientData.length,
        recepten: receptenDefs.length,
        gerechten: gerechtenCount,
        mepTaken: mepDefs.length,
        voorraadBewegingen: bewegingen.length,
      },
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Onbekende fout bij seed data." };
  }
}
