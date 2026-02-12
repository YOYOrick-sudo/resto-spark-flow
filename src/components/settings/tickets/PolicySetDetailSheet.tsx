import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { NestoInput } from "@/components/polar/NestoInput";
import { NestoSelect } from "@/components/polar/NestoSelect";
import { NestoButton } from "@/components/polar/NestoButton";
import { FormSection } from "@/components/polar/FormSection";
import { InfoAlert } from "@/components/polar/InfoAlert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreatePolicySet, useUpdatePolicySet, usePolicySet } from "@/hooks/usePolicySets";
import type { PaymentType, CancelPolicyType, NoshowPolicyType } from "@/types/tickets";

interface PolicySetDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
  policySetId?: string | null;
  onCreated?: (id: string) => void;
}

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

export function PolicySetDetailSheet({
  open,
  onOpenChange,
  locationId,
  policySetId,
  onCreated,
}: PolicySetDetailSheetProps) {
  const isEditing = !!policySetId;
  const { data: existingPolicy } = usePolicySet(policySetId ?? undefined);

  // Form state
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

  const { mutate: create, isPending: isCreating } = useCreatePolicySet(locationId);
  const { mutate: update, isPending: isUpdating } = useUpdatePolicySet(locationId);
  const isPending = isCreating || isUpdating;

  // Populate form for editing
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

  // Reset on close
  useEffect(() => {
    if (!open) {
      setInitialized(false);
      setName("");
      setDescription("");
      setPaymentType("none");
      setAmountEuros("");
      setCancelType("free");
      setCancelHours("");
      setNoshowType("mark_only");
      setNoshowMinutes("15");
      setNoshowChargeEuros("");
      setReconfirmEnabled(false);
      setReconfirmHours("24");
      setReconfirmRequired(false);
      setErrors({});
    }
  }, [open]);

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
    if (!validate()) return;

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

    if (isEditing && policySetId) {
      update(
        { id: policySetId, ...payload },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      create(
        { location_id: locationId, ...payload },
        {
          onSuccess: (id) => {
            onCreated?.(id);
            onOpenChange(false);
          },
        }
      );
    }
  };

  const linkedTickets = (existingPolicy as any)?.linkedTickets ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Beleid bewerken" : "Nieuw beleid"}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {/* Sectie 1 — Basis */}
          <FormSection title="Basis" description="Naam en beschrijving van het beleid.">
            <div className="space-y-3">
              <NestoInput
                label="Naam"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="bijv. Fine Dining, Kerst Special"
                error={errors.name}
                autoFocus={!isEditing}
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
          </FormSection>

          {/* Sectie 2 — Betaling */}
          <FormSection title="Betaling" description="Aanbetaling, prepay of no-show garantie.">
            <div className="space-y-3">
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
          </FormSection>

          {/* Sectie 3 — Annulering */}
          <FormSection title="Annulering" description="Wanneer en hoe gasten kunnen annuleren.">
            <div className="space-y-3">
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
          </FormSection>

          {/* Sectie 4 — No-show */}
          <FormSection title="No-show" description="Wat gebeurt er als gasten niet komen opdagen.">
            <div className="space-y-3">
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
          </FormSection>

          {/* Sectie 5 — Reconfirmatie */}
          <FormSection title="Reconfirmatie" description="Vraag gasten om hun reservering te bevestigen.">
            <div className="space-y-3">
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
          </FormSection>

          {/* Gekoppelde tickets */}
          {isEditing && linkedTickets.length > 0 && (
            <div className="space-y-2">
              {linkedTickets.length > 1 && (
                <InfoAlert
                  variant="warning"
                  title={`Wijzigingen gelden voor ${linkedTickets.length} gekoppelde tickets`}
                  description="Aanpassingen aan dit beleid zijn direct van toepassing op alle onderstaande tickets."
                />
              )}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Gekoppelde tickets</Label>
                <div className="space-y-1">
                  {linkedTickets.map((t: any) => (
                    <div key={t.id} className="text-sm text-muted-foreground px-2 py-1 bg-muted/50 rounded">
                      {t.display_title}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2 pb-4">
            <NestoButton type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuleren
            </NestoButton>
            <NestoButton type="submit" disabled={isPending}>
              {isPending ? "Opslaan..." : isEditing ? "Opslaan" : "Beleid aanmaken"}
            </NestoButton>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
