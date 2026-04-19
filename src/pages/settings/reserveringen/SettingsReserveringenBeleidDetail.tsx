import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CreditCard, CalendarX, UserX, BellRing, FileText, Loader2 } from "lucide-react";
import { SettingsDetailLayout } from "@/components/settings/layouts/SettingsDetailLayout";
import { SettingsCardHeader } from "@/components/settings/SettingsCardHeader";
import { SettingsSaveIndicator, type SaveState } from "@/components/settings/SettingsSaveIndicator";
import { NestoCard } from "@/components/polar/NestoCard";
import { NestoInput } from "@/components/polar/NestoInput";
import { NestoSelect } from "@/components/polar/NestoSelect";
import { NestoButton } from "@/components/polar/NestoButton";
import { InfoAlert } from "@/components/polar/InfoAlert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreatePolicySet, useUpdatePolicySet, usePolicySet } from "@/hooks/usePolicySets";
import { useUserContext } from "@/contexts/UserContext";
import { buildBreadcrumbs } from "@/lib/settingsRouteConfig";
import { nestoToast } from "@/lib/nestoToast";
import type { PaymentType, CancelPolicyType, NoshowPolicyType } from "@/types/tickets";

const paymentTypeOptions = [
  { value: "none", label: "Geen betaling" },
  { value: "deposit", label: "Aanbetaling" },
  { value: "full_prepay", label: "Volledige prepay" },
  { value: "no_show_guarantee", label: "No-show garantie" },
];

const cancelOptions = [
  { value: "free", label: "Gratis annuleren" },
  { value: "window", label: "Annuleren tot X uur voor" },
  { value: "no_cancel", label: "Niet annuleerbaar" },
];

const noshowOptions = [
  { value: "none", label: "Geen actie" },
  { value: "mark_only", label: "Alleen markeren" },
  { value: "charge", label: "Kosten in rekening brengen" },
];

export default function SettingsReserveringenBeleidDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  const isNew = !id || id === "nieuw";
  const policySetId = isNew ? undefined : id;

  const { data: existingPolicy, isLoading: policyLoading, isError: policyError } = usePolicySet(policySetId);

  // Form state — 1-op-1 gemigreerd uit PolicySetDetailSheet
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [paymentType, setPaymentType] = useState<PaymentType>("none");
  const [amountEuros, setAmountEuros] = useState("");
  const [cancelType, setCancelType] = useState<CancelPolicyType>("free");
  const [cancelHours, setCancelHours] = useState("");
  const [noshowType, setNoshowType] = useState<NoshowPolicyType>("mark_only");
  const [noshowMinutes, setNoshowMinutes] = useState("15");
  const [noshowChargeEuros, setNoshowChargeEuros] = useState("");
  const [reconfirmEnabled, setReconfirmEnabled] = useState(false);
  const [reconfirmHours, setReconfirmHours] = useState("24");
  const [reconfirmRequired, setReconfirmRequired] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const { mutate: create, isPending: isCreating } = useCreatePolicySet(locationId);
  const { mutate: update, isPending: isUpdating } = useUpdatePolicySet(locationId);
  const isPending = isCreating || isUpdating;

  // Populate form for editing — 1-op-1 uit Sheet
  useEffect(() => {
    if (existingPolicy && !initialized) {
      setName(existingPolicy.name);
      setDescription(existingPolicy.description ?? "");
      setPaymentType(existingPolicy.payment_type as PaymentType);
      setAmountEuros(
        existingPolicy.payment_amount_cents
          ? (existingPolicy.payment_amount_cents / 100).toString()
          : ""
      );
      setCancelType(existingPolicy.cancel_policy_type as CancelPolicyType);
      setCancelHours(existingPolicy.cancel_window_hours?.toString() ?? "");
      setNoshowType(existingPolicy.noshow_policy_type as NoshowPolicyType);
      setNoshowMinutes(existingPolicy.noshow_mark_after_minutes?.toString() ?? "15");
      setNoshowChargeEuros(
        existingPolicy.noshow_charge_amount_cents
          ? (existingPolicy.noshow_charge_amount_cents / 100).toString()
          : ""
      );
      setReconfirmEnabled(existingPolicy.reconfirm_enabled);
      setReconfirmHours(existingPolicy.reconfirm_hours_before?.toString() ?? "24");
      setReconfirmRequired(existingPolicy.reconfirm_required);
      setInitialized(true);
    }
  }, [existingPolicy, initialized]);

  // Validatie — 1-op-1 uit Sheet (regel 118-129)
  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Naam is verplicht";
    if (paymentType !== "none" && (!amountEuros || parseFloat(amountEuros) <= 0))
      e.amount = "Bedrag is verplicht";
    if (cancelType === "window" && (!cancelHours || parseInt(cancelHours) <= 0))
      e.cancelHours = "Uren is verplicht";
    if (noshowType === "charge" && (!noshowChargeEuros || parseFloat(noshowChargeEuros) <= 0))
      e.noshowCharge = "Bedrag is verplicht";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !locationId) return;

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      payment_type: paymentType,
      payment_amount_cents: paymentType !== "none" ? Math.round(parseFloat(amountEuros) * 100) : null,
      cancel_policy_type: cancelType,
      cancel_window_hours: cancelType === "window" ? parseInt(cancelHours) : null,
      noshow_policy_type: noshowType,
      noshow_mark_after_minutes: noshowType !== "none" ? parseInt(noshowMinutes) || 15 : null,
      noshow_charge_amount_cents:
        noshowType === "charge" ? Math.round(parseFloat(noshowChargeEuros) * 100) : null,
      reconfirm_enabled: reconfirmEnabled,
      reconfirm_hours_before: reconfirmEnabled ? parseInt(reconfirmHours) || 24 : null,
      reconfirm_required: reconfirmEnabled ? reconfirmRequired : false,
    };

    setSaveState("saving");

    if (!isNew && policySetId) {
      // Update — gebruikt inline-button SaveIndicator (click-to-save), géén toast op succes
      update(
        { id: policySetId, ...payload },
        {
          onSuccess: () => setSaveState("saved"),
          onError: () => setSaveState("error"),
        }
      );
    } else {
      // Create = expliciete actie → toast blijft, navigate terug naar lijst
      create(
        { location_id: locationId, ...payload },
        {
          onSuccess: () => {
            setSaveState("idle");
            nestoToast.success("Beleid aangemaakt");
            navigate("/instellingen/reserveringen/beleid");
          },
          onError: () => setSaveState("error"),
        }
      );
    }
  };

  const linkedTickets = (existingPolicy as any)?.linkedTickets ?? [];

  // Breadcrumbs — dynamische laatste crumb
  const itemLabel = isNew ? "Nieuw beleid" : (existingPolicy?.name ?? "Beleid");
  const breadcrumbs = buildBreadcrumbs("reserveringen", "beleid", undefined, itemLabel);

  // URL escape: /beleid/<invalid-uuid> → graceful error
  if (!isNew && !policyLoading && (policyError || !existingPolicy)) {
    return (
      <SettingsDetailLayout
        title="Beleid niet gevonden"
        description="Dit beleid bestaat niet (meer) of je hebt er geen toegang toe."
        breadcrumbs={buildBreadcrumbs("reserveringen", "beleid", undefined, "Niet gevonden")}
      >
        <NestoCard>
          <div className="space-y-4 py-4 text-center">
            <p className="text-sm text-muted-foreground">
              Het opgevraagde beleid kon niet worden geladen.
            </p>
            <NestoButton
              variant="outline"
              onClick={() => navigate("/instellingen/reserveringen/beleid")}
            >
              Terug naar overzicht
            </NestoButton>
          </div>
        </NestoCard>
      </SettingsDetailLayout>
    );
  }

  if (!isNew && policyLoading) {
    return (
      <SettingsDetailLayout title="Beleid laden…" breadcrumbs={breadcrumbs}>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </SettingsDetailLayout>
    );
  }

  return (
    <SettingsDetailLayout
      title={itemLabel}
      description={isNew
        ? "Maak een nieuw betalings- en annuleringsbeleid aan."
        : "Beheer betalings-, annulerings- en no-show regels voor dit beleid."}
      breadcrumbs={breadcrumbs}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Card 1 — Basis */}
        <NestoCard>
          <SettingsCardHeader
            icon={<FileText />}
            title="Basis"
            description="Naam en beschrijving van het beleid."
          />
          <div className="space-y-4">
            <NestoInput
              label="Naam"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="bijv. Fine Dining, Kerst Special"
              error={errors.name}
              autoFocus={isNew}
            />
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Beschrijving</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 200))}
                placeholder="Bijv. voor groepen vanaf 8 personen"
                rows={2}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">{description.length}/200</p>
            </div>
          </div>
        </NestoCard>

        {/* Card 2 — Betaling */}
        <NestoCard>
          <SettingsCardHeader
            icon={<CreditCard />}
            title="Betaling"
            description="Aanbetaling, prepay of no-show garantie."
          />
          <div className="space-y-4">
            <NestoSelect
              label="Betaaltype"
              value={paymentType}
              onValueChange={(v) => setPaymentType(v as PaymentType)}
              options={paymentTypeOptions}
            />
            {paymentType !== "none" && (
              <NestoInput
                label="Bedrag per persoon (€)"
                type="number"
                min="0"
                step="0.01"
                value={amountEuros}
                onChange={(e) => setAmountEuros(e.target.value)}
                placeholder="0.00"
                error={errors.amount}
              />
            )}
          </div>
        </NestoCard>

        {/* Card 3 — Annulering */}
        <NestoCard>
          <SettingsCardHeader
            icon={<CalendarX />}
            title="Annulering"
            description="Wanneer en hoe gasten kunnen annuleren."
          />
          <div className="space-y-4">
            <NestoSelect
              label="Annuleringsbeleid"
              value={cancelType}
              onValueChange={(v) => setCancelType(v as CancelPolicyType)}
              options={cancelOptions}
            />
            {cancelType === "window" && (
              <NestoInput
                label="Uren voor aanvang"
                type="number"
                min="1"
                value={cancelHours}
                onChange={(e) => setCancelHours(e.target.value)}
                placeholder="24"
                error={errors.cancelHours}
              />
            )}
          </div>
        </NestoCard>

        {/* Card 4 — No-show */}
        <NestoCard>
          <SettingsCardHeader
            icon={<UserX />}
            title="No-show"
            description="Wat gebeurt er als gasten niet komen opdagen."
          />
          <div className="space-y-4">
            <NestoSelect
              label="No-show beleid"
              value={noshowType}
              onValueChange={(v) => setNoshowType(v as NoshowPolicyType)}
              options={noshowOptions}
            />
            {noshowType !== "none" && (
              <NestoInput
                label="Markeren na X minuten"
                type="number"
                min="1"
                value={noshowMinutes}
                onChange={(e) => setNoshowMinutes(e.target.value)}
                placeholder="15"
              />
            )}
            {noshowType === "charge" && (
              <NestoInput
                label="Kosten per persoon (€)"
                type="number"
                min="0"
                step="0.01"
                value={noshowChargeEuros}
                onChange={(e) => setNoshowChargeEuros(e.target.value)}
                placeholder="0.00"
                error={errors.noshowCharge}
              />
            )}
          </div>
        </NestoCard>

        {/* Card 5 — Reconfirmatie */}
        <NestoCard>
          <SettingsCardHeader
            icon={<BellRing />}
            title="Reconfirmatie"
            description="Vraag gasten om hun reservering te bevestigen."
          />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Reconfirmatie inschakelen</Label>
              <Switch checked={reconfirmEnabled} onCheckedChange={setReconfirmEnabled} />
            </div>
            {reconfirmEnabled && (
              <>
                <NestoInput
                  label="Uren voor aanvang"
                  type="number"
                  min="1"
                  value={reconfirmHours}
                  onChange={(e) => setReconfirmHours(e.target.value)}
                  placeholder="24"
                />
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Verplicht (auto-cancel zonder bevestiging)</Label>
                  <Switch checked={reconfirmRequired} onCheckedChange={setReconfirmRequired} />
                </div>
              </>
            )}
          </div>
        </NestoCard>

        {/* Gekoppelde tickets — alleen bij edit + ≥1 ticket */}
        {!isNew && linkedTickets.length > 0 && (
          <NestoCard>
            <SettingsCardHeader
              title="Gekoppelde tickets"
              description={`Dit beleid is actief op ${linkedTickets.length} ticket${linkedTickets.length !== 1 ? "s" : ""}.`}
            />
            <div className="space-y-2">
              {linkedTickets.length > 1 && (
                <InfoAlert
                  variant="warning"
                  title={`Wijzigingen gelden voor ${linkedTickets.length} gekoppelde tickets`}
                  description="Aanpassingen aan dit beleid zijn direct van toepassing op alle onderstaande tickets."
                />
              )}
              <div className="space-y-1">
                {linkedTickets.map((t: any) => (
                  <div key={t.id} className="text-sm text-muted-foreground px-3 py-2 bg-muted/40 border border-border/40 rounded-md">
                    {t.display_title}
                  </div>
                ))}
              </div>
            </div>
          </NestoCard>
        )}

        {/* Footer — inline-button SaveIndicator (click-to-save pattern) */}
        <div className="flex justify-end items-center gap-3 pt-2 pb-8">
          <SettingsSaveIndicator
            state={saveState}
            variant="inline-button"
            onAutoFade={() => setSaveState("idle")}
          />
          <NestoButton
            type="button"
            variant="outline"
            onClick={() => navigate("/instellingen/reserveringen/beleid")}
          >
            {isNew ? "Annuleren" : "Terug"}
          </NestoButton>
          <NestoButton type="submit" disabled={isPending}>
            {isPending ? "Opslaan..." : isNew ? "Beleid aanmaken" : "Opslaan"}
          </NestoButton>
        </div>
      </form>
    </SettingsDetailLayout>
  );
}
