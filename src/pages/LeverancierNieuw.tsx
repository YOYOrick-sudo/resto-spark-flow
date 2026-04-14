import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { NestoButton, NestoInput, NestoSelect } from "@/components/polar";
import { Textarea } from "@/components/ui/textarea";
import { useVoorraadInkoopMutations } from "@/hooks/useVoorraadInkoopMutations";
import { ConfirmDialog } from "@/components/polar/ConfirmDialog";

const typeOptions = [
  { value: "groothandel", label: "Groothandel" },
  { value: "lokaal", label: "Lokaal" },
  { value: "speciaalzaak", label: "Speciaalzaak" },
  { value: "overig", label: "Overig" },
];

export default function LeverancierNieuw() {
  const navigate = useNavigate();
  const { createLeverancier } = useVoorraadInkoopMutations();
  const [showCancel, setShowCancel] = useState(false);

  const [form, setForm] = useState({
    naam: "",
    type: "",
    contactpersoon: "",
    email: "",
    telefoon: "",
    klantnummer: "",
    notities: "",
  });

  const isDirty = form.naam.trim() !== "" || form.contactpersoon !== "" || form.email !== "";
  const isValid = form.naam.trim().length > 0;

  const update = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleBack = () => {
    if (isDirty) {
      setShowCancel(true);
    } else {
      navigate("/inkoop/leveranciers");
    }
  };

  const handleSave = () => {
    if (!isValid) return;
    createLeverancier.mutate(
      {
        naam: form.naam.trim(),
        type: form.type || undefined,
        contactpersoon: form.contactpersoon || undefined,
        email: form.email || undefined,
        telefoon: form.telefoon || undefined,
        klantnummer: form.klantnummer || undefined,
        notities: form.notities || undefined,
      },
      {
        onSuccess: (data) => {
          navigate("/inkoop/leveranciers");
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Back link */}
      <button
        onClick={handleBack}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Leveranciers
      </button>

      {/* Centered form */}
      <div className="max-w-[640px] mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Nieuwe leverancier</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Voeg een nieuwe leverancier toe aan het systeem.
          </p>
        </div>

        {/* Basis */}
        <section className="space-y-4">
          <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Basisgegevens
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <NestoInput
                label="Naam *"
                value={form.naam}
                onChange={(e) => update("naam", e.target.value)}
                placeholder="Bijv. Bidfood, Sligro"
              />
            </div>
            <NestoSelect
              label="Type"
              options={typeOptions}
              value={form.type}
              onValueChange={(v) => update("type", v)}
              placeholder="Selecteer type"
            />
            <NestoInput
              label="Klantnummer"
              value={form.klantnummer}
              onChange={(e) => update("klantnummer", e.target.value)}
              placeholder="Optioneel"
            />
          </div>
        </section>

        {/* Contactgegevens */}
        <section className="space-y-4">
          <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Contactgegevens
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <NestoInput
              label="Contactpersoon"
              value={form.contactpersoon}
              onChange={(e) => update("contactpersoon", e.target.value)}
              placeholder="Naam contactpersoon"
            />
            <NestoInput
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="email@voorbeeld.nl"
            />
            <NestoInput
              label="Telefoon"
              value={form.telefoon}
              onChange={(e) => update("telefoon", e.target.value)}
              placeholder="+31..."
            />
          </div>
        </section>

        {/* Notities */}
        <section className="space-y-4">
          <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Notities
          </h2>
          <Textarea
            value={form.notities}
            onChange={(e) => update("notities", e.target.value)}
            placeholder="Optionele opmerkingen over deze leverancier..."
            rows={3}
            className="resize-none"
          />
        </section>

        {/* Footer actions */}
        <div className="flex justify-end gap-3 border-t border-border/50 pt-5">
          <NestoButton variant="ghost" onClick={handleBack}>
            Annuleren
          </NestoButton>
          <NestoButton
            onClick={handleSave}
            disabled={!isValid}
            isLoading={createLeverancier.isPending}
          >
            Leverancier opslaan
          </NestoButton>
        </div>
      </div>

      <ConfirmDialog
        open={showCancel}
        onOpenChange={setShowCancel}
        title="Wijzigingen annuleren?"
        description="Je hebt onopgeslagen wijzigingen. Weet je zeker dat je terug wilt?"
        confirmLabel="Ja, annuleren"
        onConfirm={() => navigate("/inkoop/leveranciers")}
        variant="destructive"
      />
    </div>
  );
}
