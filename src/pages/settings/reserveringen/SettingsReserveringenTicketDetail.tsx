import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { SettingsDetailLayout } from "@/components/settings/layouts/SettingsDetailLayout";
import { NestoCard } from "@/components/polar/NestoCard";
import { NestoInput } from "@/components/polar/NestoInput";
import { NestoSelect } from "@/components/polar/NestoSelect";
import { NestoButton } from "@/components/polar/NestoButton";
import { FormSection } from "@/components/polar/FormSection";
import { PolicySetModal } from "@/components/settings/tickets/PolicySetModal";
import { useTickets } from "@/hooks/useTickets";
import { useCreateTicket, useUpdateTicket } from "@/hooks/useTicketMutations";
import { usePolicySets } from "@/hooks/usePolicySets";
import { useUserContext } from "@/contexts/UserContext";
import { buildBreadcrumbs } from "@/lib/settingsRouteConfig";
import { Loader2 } from "lucide-react";
import type { TicketType } from "@/types/tickets";

const COLOR_PRESETS = [
  "#0d9488", "#3b82f6", "#8b5cf6", "#ec4899",
  "#f59e0b", "#ef4444", "#10b981", "#6366f1",
];

export default function SettingsReserveringenTicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  const isNew = !id;
  const { data: ticketsData, isLoading: ticketsLoading } = useTickets(locationId);
  const editingTicket = id
    ? [...(ticketsData?.visibleTickets ?? []), ...(ticketsData?.archivedTickets ?? [])].find(t => t.id === id)
    : null;

  const isDefault = editingTicket?.ticket_type === "default";

  // Form state
  const [ticketType, setTicketType] = useState<TicketType>("regular");
  const [name, setName] = useState("");
  const [displayTitle, setDisplayTitle] = useState("");
  const [shortDesc, setShortDesc] = useState("");
  const [color, setColor] = useState("#0d9488");
  const [duration, setDuration] = useState("90");
  const [buffer, setBuffer] = useState("15");
  const [minParty, setMinParty] = useState("1");
  const [maxParty, setMaxParty] = useState("20");
  const [policySetId, setPolicySetId] = useState<string>("__none__");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const { data: policySets = [] } = usePolicySets(locationId);
  const { mutate: createTicket, isPending: isCreating } = useCreateTicket(locationId);
  const { mutate: updateTicket, isPending: isUpdating } = useUpdateTicket(locationId);
  const isPending = isCreating || isUpdating;

  // Populate form when editing
  useEffect(() => {
    if (editingTicket && !initialized) {
      setTicketType(editingTicket.ticket_type as TicketType);
      setName(editingTicket.name);
      setDisplayTitle(editingTicket.display_title);
      setShortDesc(editingTicket.short_description ?? "");
      setColor(editingTicket.color);
      setDuration(String(editingTicket.duration_minutes));
      setBuffer(String(editingTicket.buffer_minutes));
      setMinParty(String(editingTicket.min_party_size));
      setMaxParty(String(editingTicket.max_party_size));
      setPolicySetId(editingTicket.policy_set_id ?? "__none__");
      setInitialized(true);
    }
  }, [editingTicket, initialized]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Naam is verplicht";
    if (!displayTitle.trim()) e.displayTitle = "Display titel is verplicht";
    if (parseInt(duration) <= 0) e.duration = "Moet groter dan 0 zijn";
    if (parseInt(minParty) > parseInt(maxParty)) e.minParty = "Min moet ≤ max zijn";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !locationId) return;

    const payload = {
      name: name.trim(),
      display_title: displayTitle.trim(),
      short_description: shortDesc.trim() || null,
      color,
      ticket_type: ticketType,
      duration_minutes: parseInt(duration),
      buffer_minutes: parseInt(buffer),
      min_party_size: parseInt(minParty),
      max_party_size: parseInt(maxParty),
      policy_set_id: policySetId === "__none__" ? null : policySetId,
    };

    if (!isNew && editingTicket) {
      updateTicket(
        { id: editingTicket.id, ...payload },
        { onSuccess: () => navigate("/instellingen/reserveringen/tickets") }
      );
    } else {
      createTicket(
        { location_id: locationId, ...payload },
        { onSuccess: () => navigate("/instellingen/reserveringen/tickets") }
      );
    }
  };

  const policyOptions = [
    { value: "__none__", label: "Geen beleid" },
    ...policySets.map((p) => ({ value: p.id, label: p.name })),
  ];

  const breadcrumbs = buildBreadcrumbs(
    "reserveringen",
    "tickets",
    undefined,
    isNew ? "Nieuw ticket" : editingTicket?.display_title ?? "Bewerken"
  );

  // Loading state for edit mode
  if (!isNew && ticketsLoading) {
    return (
      <SettingsDetailLayout title="Ticket" breadcrumbs={breadcrumbs}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </SettingsDetailLayout>
    );
  }

  if (!isNew && !editingTicket && !ticketsLoading) {
    return (
      <SettingsDetailLayout title="Ticket niet gevonden" breadcrumbs={breadcrumbs}>
        <p className="text-sm text-muted-foreground">Dit ticket bestaat niet of is verwijderd.</p>
      </SettingsDetailLayout>
    );
  }

  return (
    <>
      <SettingsDetailLayout
        title={isNew ? "Nieuw ticket" : editingTicket?.display_title ?? "Ticket bewerken"}
        description={isNew ? "Maak een nieuw reserveringsproduct aan." : "Bewerk de instellingen van dit ticket."}
        breadcrumbs={breadcrumbs}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sectie 1 — Basis */}
          <NestoCard className="p-6">
            <FormSection title="Basis" description="Type, naam en uiterlijk van het ticket.">
              <div className="space-y-4">
                {!isDefault && (
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Type</label>
                    <div className="flex gap-3">
                      {(["regular", "event"] as const).map((t) => (
                        <label
                          key={t}
                          className={`flex items-center gap-2 cursor-pointer rounded-button border px-3 py-2 text-sm transition-colors ${
                            ticketType === t
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border text-muted-foreground hover:border-primary/40"
                          }`}
                        >
                          <input
                            type="radio"
                            name="ticketType"
                            value={t}
                            checked={ticketType === t}
                            onChange={() => setTicketType(t)}
                            className="sr-only"
                          />
                          {t === "regular" ? "Regulier" : "Event"}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <NestoInput
                  label="Naam (intern)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="bijv. Diner standaard"
                  error={errors.name}
                  autoFocus={isNew}
                />
                <NestoInput
                  label="Display titel (gastzichtbaar)"
                  value={displayTitle}
                  onChange={(e) => setDisplayTitle(e.target.value)}
                  placeholder="bijv. Reservering"
                  error={errors.displayTitle}
                />
                <div>
                  <NestoInput
                    label="Korte beschrijving"
                    value={shortDesc}
                    onChange={(e) => setShortDesc(e.target.value.slice(0, 120))}
                    placeholder="Optioneel, max 120 tekens"
                  />
                  <p className="text-xs text-muted-foreground mt-1 text-right">{shortDesc.length}/120</p>
                </div>

                {/* Color picker */}
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Kleur</label>
                  <div className="flex gap-2 flex-wrap">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`h-8 w-8 rounded-full border-2 transition-all ${
                          color === c ? "border-foreground scale-110" : "border-transparent"
                        }`}
                        style={{ backgroundColor: c }}
                        onClick={() => setColor(c)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </FormSection>
          </NestoCard>

          {/* Sectie 2 — Reservering */}
          <NestoCard className="p-6">
            <FormSection title="Reservering" description="Tafeltijd, buffer en gastenlimieten.">
              <div className="grid grid-cols-2 gap-4">
                <NestoInput
                  label="Tafeltijd (min)"
                  type="number"
                  min="1"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  error={errors.duration}
                />
                <NestoInput
                  label="Buffer (min)"
                  type="number"
                  min="0"
                  value={buffer}
                  onChange={(e) => setBuffer(e.target.value)}
                />
                <NestoInput
                  label="Min gasten"
                  type="number"
                  min="1"
                  value={minParty}
                  onChange={(e) => setMinParty(e.target.value)}
                  error={errors.minParty}
                />
                <NestoInput
                  label="Max gasten"
                  type="number"
                  min="1"
                  value={maxParty}
                  onChange={(e) => setMaxParty(e.target.value)}
                />
              </div>
            </FormSection>
          </NestoCard>

          {/* Sectie 3 — Beleid */}
          <NestoCard className="p-6">
            <FormSection title="Beleid" description="Koppel een betalings- en annuleringsbeleid.">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <NestoSelect
                    label="Beleid"
                    value={policySetId}
                    onValueChange={setPolicySetId}
                    options={policyOptions}
                  />
                </div>
                <NestoButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPolicyModalOpen(true)}
                  className="mb-0.5"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Nieuw beleid
                </NestoButton>
              </div>
            </FormSection>
          </NestoCard>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2 pb-8">
            <NestoButton
              type="button"
              variant="outline"
              onClick={() => navigate("/instellingen/reserveringen/tickets")}
            >
              Annuleren
            </NestoButton>
            <NestoButton type="submit" disabled={isPending}>
              {isPending ? "Opslaan..." : isNew ? "Aanmaken" : "Opslaan"}
            </NestoButton>
          </div>
        </form>
      </SettingsDetailLayout>

      <PolicySetModal
        open={policyModalOpen}
        onOpenChange={setPolicyModalOpen}
        locationId={locationId ?? ""}
        onCreated={(id) => setPolicySetId(id)}
      />
    </>
  );
}
