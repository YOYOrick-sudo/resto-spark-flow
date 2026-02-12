// ============================================
// Policy Set Summary — Leesbare samenvattingen
// ============================================

const priceFormatter = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
});

interface PolicySetLike {
  payment_type: string;
  payment_amount_cents: number | null;
  cancel_policy_type: string;
  cancel_window_hours: number | null;
  noshow_policy_type: string;
  noshow_mark_after_minutes: number | null;
  noshow_charge_amount_cents: number | null;
  reconfirm_enabled: boolean;
  reconfirm_hours_before: number | null;
  reconfirm_required: boolean;
}

export function formatPaymentSummary(ps: PolicySetLike): string {
  if (ps.payment_type === "none") return "Geen betaling";
  const amount = priceFormatter.format((ps.payment_amount_cents ?? 0) / 100);
  switch (ps.payment_type) {
    case "deposit":
      return `${amount} p.p. deposit`;
    case "full_prepay":
      return `${amount} p.p. prepay`;
    case "no_show_guarantee":
      return `No-show garantie ${amount}`;
    default:
      return "Geen betaling";
  }
}

export function formatCancelSummary(ps: PolicySetLike): string {
  switch (ps.cancel_policy_type) {
    case "free":
      return "Gratis annuleren";
    case "window":
      return `Annuleren tot ${ps.cancel_window_hours ?? 24}u voor aanvang`;
    case "no_cancel":
      return "Niet annuleerbaar";
    default:
      return "Gratis annuleren";
  }
}

export function formatNoshowSummary(ps: PolicySetLike): string {
  switch (ps.noshow_policy_type) {
    case "none":
      return "Geen actie";
    case "mark_only":
      return `Markeren na ${ps.noshow_mark_after_minutes ?? 15} min`;
    case "charge": {
      const amount = ps.noshow_charge_amount_cents
        ? priceFormatter.format(ps.noshow_charge_amount_cents / 100)
        : "bedrag";
      return `Kosten ${amount} na ${ps.noshow_mark_after_minutes ?? 15} min`;
    }
    default:
      return "Geen actie";
  }
}

export function formatReconfirmSummary(ps: PolicySetLike): string {
  if (!ps.reconfirm_enabled) return "Uit";
  const hours = ps.reconfirm_hours_before ?? 24;
  return ps.reconfirm_required
    ? `${hours}u voor, verplicht`
    : `${hours}u voor, optioneel`;
}
