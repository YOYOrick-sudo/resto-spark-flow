import { useEffect, useMemo, useState } from "react";
import { SettingsDetailLayout } from "@/components/settings/layouts/SettingsDetailLayout";
import { NestoCard, NestoCardContent, NestoButton, Spinner } from "@/components/polar";
import { buildBreadcrumbs } from "@/lib/settingsRouteConfig";
import { useKeukenSettings, useUpdateKeukenSettings } from "@/hooks/useKeukenSettings";
import { nestoToast } from "@/lib/nestoToast";
import { InputWithSuffix } from "./_shared";
import { SettingsCardHeader, SettingsSaveIndicator, type SaveState } from "@/components/settings";
import { X, Plus, Mail } from "lucide-react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SettingsKeukenInkoop() {
  const { data: settings, isLoading } = useKeukenSettings();
  const updateSettings = useUpdateKeukenSettings();

  // Besteladvies buffer
  const [buffer, setBuffer] = useState("");
  const [bufferSaveState, setBufferSaveState] = useState<SaveState>("idle");

  // Pakbon klacht config
  const [klachtEmail, setKlachtEmail] = useState("");
  const [klachtCc, setKlachtCc] = useState<string[]>([]);
  const [newCc, setNewCc] = useState("");
  const [ccError, setCcError] = useState<string | null>(null);
  const [klachtSaveState, setKlachtSaveState] = useState<SaveState>("idle");

  useEffect(() => {
    if (settings) {
      setBuffer(String(settings.besteladvies_buffer_percentage ?? 20));
      setKlachtEmail(settings.pakbon_klacht_email ?? "");
      setKlachtCc(settings.pakbon_klacht_cc ?? []);
    }
  }, [settings]);

  const isBufferDirty = useMemo(() => {
    if (!settings) return false;
    return String(settings.besteladvies_buffer_percentage ?? 20) !== buffer;
  }, [settings, buffer]);

  const isKlachtDirty = useMemo(() => {
    if (!settings) return false;
    const currentEmail = settings.pakbon_klacht_email ?? "";
    const currentCc = settings.pakbon_klacht_cc ?? [];
    if (currentEmail !== klachtEmail) return true;
    if (currentCc.length !== klachtCc.length) return true;
    return currentCc.some((v, i) => v !== klachtCc[i]);
  }, [settings, klachtEmail, klachtCc]);

  const klachtEmailValid = !klachtEmail || EMAIL_REGEX.test(klachtEmail.trim());

  const handleSaveBuffer = async () => {
    setBufferSaveState("saving");
    try {
      await updateSettings.mutateAsync({
        besteladvies_buffer_percentage: parseFloat(buffer) || 20,
      });
      setBufferSaveState("saved");
    } catch (e) {
      setBufferSaveState("error");
      nestoToast.error("Opslaan mislukt", e instanceof Error ? e.message : undefined);
    }
  };

  const handleAddCc = () => {
    const trimmed = newCc.trim().toLowerCase();
    if (!trimmed) return;
    if (!EMAIL_REGEX.test(trimmed)) {
      setCcError("Geen geldig e-mailadres");
      return;
    }
    if (klachtCc.includes(trimmed)) {
      setCcError("Dit adres staat al in de lijst");
      return;
    }
    setKlachtCc([...klachtCc, trimmed]);
    setNewCc("");
    setCcError(null);
  };

  const handleRemoveCc = (idx: number) => {
    setKlachtCc(klachtCc.filter((_, i) => i !== idx));
  };

  const handleSaveKlacht = async () => {
    if (!klachtEmailValid) {
      nestoToast.error("Controleer e-mailadres", "Het hoofdadres is geen geldig e-mailadres.");
      return;
    }
    setKlachtSaveState("saving");
    try {
      await updateSettings.mutateAsync({
        pakbon_klacht_email: klachtEmail.trim() ? klachtEmail.trim().toLowerCase() : null,
        pakbon_klacht_cc: klachtCc,
      });
      setKlachtSaveState("saved");
    } catch (e) {
      setKlachtSaveState("error");
      nestoToast.error("Opslaan mislukt", e instanceof Error ? e.message : undefined);
    }
  };

  return (
    <SettingsDetailLayout
      title="Inkoop & Voorraad"
      description="Instellingen voor besteladvies, voorraadberekeningen en klachtafhandeling bij ontvangst."
      breadcrumbs={buildBreadcrumbs("keuken", "inkoop")}
    >
      <NestoCard>
        <NestoCardContent>
          {isLoading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : (
            <>
              {/* ──────────── Besteladvies ──────────── */}
              <SettingsCardHeader
                title="Besteladvies"
                description="Configureer hoe ruim het besteladvies wordt berekend."
              />
              <div className="max-w-md">
                <InputWithSuffix
                  label="Extra buffer bovenop het tekort"
                  value={buffer}
                  onChange={setBuffer}
                  suffix="%"
                  helpText="Bij het genereren van besteladvies wordt dit percentage bovenop het berekende tekort opgeteld."
                  step="1"
                />
              </div>
              <div className="border-t border-border/50 pt-5 mt-6 flex items-center gap-3">
                <NestoButton
                  onClick={handleSaveBuffer}
                  disabled={!isBufferDirty}
                  isLoading={updateSettings.isPending && bufferSaveState === "saving"}
                  className="min-h-[44px]"
                >
                  Opslaan
                </NestoButton>
                <SettingsSaveIndicator
                  state={bufferSaveState}
                  variant="inline-button"
                  onAutoFade={() => setBufferSaveState("idle")}
                />
              </div>
            </>
          )}
        </NestoCardContent>
      </NestoCard>

      {/* ──────────── Pakbon klachten ──────────── */}
      <NestoCard>
        <NestoCardContent>
          {isLoading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : (
            <>
              <SettingsCardHeader
                title="Pakbon klachten"
                description="Wanneer een chef bij de ontvangstcontrole een klacht meldt (te warme producten, kapotte verpakking, ontbrekend artikel), gaat er automatisch een klachtmail naar dit adres."
              />

              <div className="max-w-md space-y-5">
                {/* Hoofdadres */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Hoofdadres voor klachtmails
                  </label>
                  <div className="flex">
                    <div className="h-11 flex items-center px-3 rounded-l-button border-[1.5px] border-r-0 border-border bg-secondary text-muted-foreground">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type="email"
                      value={klachtEmail}
                      onChange={(e) => setKlachtEmail(e.target.value)}
                      placeholder="klachten@leverancier.nl"
                      className={`h-11 flex-1 rounded-r-button border-[1.5px] bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 ${
                        !klachtEmailValid
                          ? "border-destructive focus:!border-destructive"
                          : "border-border focus:!border-primary"
                      }`}
                    />
                  </div>
                  {!klachtEmailValid && (
                    <p className="text-xs text-destructive mt-1.5">Geen geldig e-mailadres</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Optioneel. In Ronde 3 kijkt het systeem eerst naar het e-mailadres van de leverancier zelf en valt pas hier op terug. Laat leeg om klachtmails uit te schakelen.
                  </p>
                </div>

                {/* CC adressen */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    CC adressen
                  </label>
                  {klachtCc.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {klachtCc.map((email, idx) => (
                        <span
                          key={email}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-sm text-foreground border border-border"
                        >
                          {email}
                          <button
                            onClick={() => handleRemoveCc(idx)}
                            className="h-4 w-4 rounded-full flex items-center justify-center hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                            aria-label={`Verwijder ${email}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={newCc}
                      onChange={(e) => { setNewCc(e.target.value); setCcError(null); }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); handleAddCc(); }
                      }}
                      placeholder="manager@restaurant.nl"
                      className={`h-11 flex-1 rounded-button border-[1.5px] bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 ${
                        ccError ? "border-destructive focus:!border-destructive" : "border-border focus:!border-primary"
                      }`}
                    />
                    <NestoButton
                      variant="outline"
                      onClick={handleAddCc}
                      disabled={!newCc.trim()}
                      className="min-h-[44px]"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Toevoegen
                    </NestoButton>
                  </div>
                  {ccError && <p className="text-xs text-destructive mt-1.5">{ccError}</p>}
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Optionele extra ontvangers (bijv. de manager of HACCP-coördinator).
                  </p>
                </div>
              </div>

              <div className="border-t border-border/50 pt-5 mt-6 flex items-center gap-3">
                <NestoButton
                  onClick={handleSaveKlacht}
                  disabled={!isKlachtDirty || !klachtEmailValid}
                  isLoading={updateSettings.isPending && klachtSaveState === "saving"}
                  className="min-h-[44px]"
                >
                  Opslaan
                </NestoButton>
                <SettingsSaveIndicator
                  state={klachtSaveState}
                  variant="inline-button"
                  onAutoFade={() => setKlachtSaveState("idle")}
                />
              </div>
            </>
          )}
        </NestoCardContent>
      </NestoCard>
    </SettingsDetailLayout>
  );
}
