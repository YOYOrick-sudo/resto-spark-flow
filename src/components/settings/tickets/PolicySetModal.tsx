import { useState } from "react";
import { NestoModal } from "@/components/polar/NestoModal";
import { NestoInput } from "@/components/polar/NestoInput";
import { NestoSelect } from "@/components/polar/NestoSelect";
import { NestoButton } from "@/components/polar/NestoButton";
import { useCreatePolicySet } from "@/hooks/usePolicySets";
import type { PaymentType, CancelPolicyType, NoshowPolicyType } from "@/types/tickets";

interface PolicySetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
  onCreated: (id: string) => void;
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

export function PolicySetModal({ open, onOpenChange, locationId, onCreated }: PolicySetModalProps) {
  const [name, setName] = useState("");
  const [paymentType, setPaymentType] = useState<PaymentType>("none");
  const [amountEuros, setAmountEuros] = useState("");
  const [cancelType, setCancelType] = useState<CancelPolicyType>("free");
  const [cancelHours, setCancelHours] = useState("");
  const [noshowType, setNoshowType] = useState<NoshowPolicyType>("mark_only");
  const [noshowMinutes, setNoshowMinutes] = useState("15");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { mutate: create, isPending } = useCreatePolicySet(locationId);

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setName("");
      setPaymentType("none");
      setAmountEuros("");
      setCancelType("free");
      setCancelHours("");
      setNoshowType("mark_only");
      setNoshowMinutes("15");
      setErrors({});
    }
    onOpenChange(isOpen);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Naam is verplicht";
    if (paymentType !== "none" && (!amountEuros || parseFloat(amountEuros) <= 0))
      e.amount = "Bedrag is verplicht";
    if (cancelType === "window" && (!cancelHours || parseInt(cancelHours) <= 0))
      e.cancelHours = "Uren is verplicht";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    create(
      {
        location_id: locationId,
        name: name.trim(),
        payment_type: paymentType,
        payment_amount_cents: paymentType !== "none" ? Math.round(parseFloat(amountEuros) * 100) : null,
        cancel_policy_type: cancelType,
        cancel_window_hours: cancelType === "window" ? parseInt(cancelHours) : null,
        noshow_policy_type: noshowType,
        noshow_mark_after_minutes:
          noshowType !== "none" ? parseInt(noshowMinutes) || 15 : null,
      },
      {
        onSuccess: (id) => {
          onCreated(id);
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <NestoModal open={open} onOpenChange={handleOpenChange} title="Nieuw beleid">
      <form onSubmit={handleSubmit} className="space-y-4">
        <NestoInput
          label="Naam"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="bijv. Weekend, Kerstdiner"
          error={errors.name}
          autoFocus
        />

        {/* Betaling */}
        <div className="border-t border-border/50 pt-4 mt-4 space-y-4">
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

        {/* Annulering */}
        <div className="border-t border-border/50 pt-4 mt-4 space-y-4">
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

        {/* No-show */}
        <div className="border-t border-border/50 pt-4 mt-4 space-y-4">
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
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <NestoButton type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </NestoButton>
          <NestoButton type="submit" disabled={isPending}>
            {isPending ? "Opslaan..." : "Beleid opslaan"}
          </NestoButton>
        </div>
      </form>
    </NestoModal>
  );
}
