import { useState } from "react";
import { NestoModal, NestoButton, NestoSelect } from "@/components/polar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useVoorraadInkoopMutations } from "@/hooks/useVoorraadInkoopMutations";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const typeOptions = [
  { value: "wholesaler", label: "Wholesaler" },
  { value: "lokaal", label: "Lokaal" },
  { value: "overig", label: "Overig" },
];

export function NieuwLeverancierModal({ open, onOpenChange }: Props) {
  const mutations = useVoorraadInkoopMutations();
  const [naam, setNaam] = useState("");
  const [type, setType] = useState("");
  const [contactpersoon, setContactpersoon] = useState("");
  const [email, setEmail] = useState("");
  const [telefoon, setTelefoon] = useState("");
  const [klantnummer, setKlantnummer] = useState("");
  const [notities, setNotities] = useState("");

  const reset = () => {
    setNaam(""); setType(""); setContactpersoon(""); setEmail("");
    setTelefoon(""); setKlantnummer(""); setNotities("");
  };

  const handleSubmit = () => {
    if (!naam.trim()) return;
    mutations.createLeverancier.mutate(
      {
        naam: naam.trim(),
        type: type || undefined,
        contactpersoon: contactpersoon || undefined,
        email: email || undefined,
        telefoon: telefoon || undefined,
        klantnummer: klantnummer || undefined,
        notities: notities || undefined,
      },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <NestoModal
      open={open}
      onOpenChange={onOpenChange}
      title="Nieuwe leverancier"
      size="md"
      footer={
        <div className="flex justify-end gap-3">
          <NestoButton variant="ghost" onClick={() => onOpenChange(false)}>
            Annuleren
          </NestoButton>
          <NestoButton
            onClick={handleSubmit}
            disabled={!naam.trim()}
            isLoading={mutations.createLeverancier.isPending}
          >
            Opslaan
          </NestoButton>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Naam *</label>
          <Input value={naam} onChange={(e) => setNaam(e.target.value)} placeholder="Leverancier naam" />
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Type</label>
          <NestoSelect options={typeOptions} value={type} onValueChange={setType} placeholder="Selecteer type" />
        </div>

        <div className="border-t border-border/50 pt-4 mt-4" />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Contactpersoon</label>
            <Input value={contactpersoon} onChange={(e) => setContactpersoon(e.target.value)} placeholder="Naam" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@voorbeeld.nl" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Telefoon</label>
            <Input value={telefoon} onChange={(e) => setTelefoon(e.target.value)} placeholder="+31..." />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Klantnummer</label>
            <Input value={klantnummer} onChange={(e) => setKlantnummer(e.target.value)} placeholder="Optioneel" />
          </div>
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Notities</label>
          <Textarea value={notities} onChange={(e) => setNotities(e.target.value)} placeholder="Optionele notities..." rows={2} />
        </div>
      </div>
    </NestoModal>
  );
}
