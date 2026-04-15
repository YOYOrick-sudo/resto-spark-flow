import { useState } from "react";
import { NestoPanel, NestoButton, NestoSelect } from "@/components/polar";
import { useVoorraadInkoopMutations } from "@/hooks/useVoorraadInkoopMutations";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const typeOptions = [
  { value: "wholesaler", label: "Wholesaler" },
  { value: "lokaal", label: "Lokaal" },
  { value: "overig", label: "Overig" },
];

interface Props {
  mode: "create" | null;
  onClose: () => void;
  onCreated: (id: string) => void;
}

export function LeverancierDetailPanel({ mode, onClose, onCreated }: Props) {
  const mutations = useVoorraadInkoopMutations();
  const [naam, setNaam] = useState("");
  const [type, setType] = useState("");
  const [contactpersoon, setContactpersoon] = useState("");
  const [email, setEmail] = useState("");
  const [telefoon, setTelefoon] = useState("");
  const [klantnummer, setKlantnummer] = useState("");
  const [notities, setNotities] = useState("");

  if (!mode) return null;

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
        onSuccess: (data) => {
          onCreated(data.id);
        },
      }
    );
  };

  return (
    <NestoPanel open={!!mode} onClose={onClose} title="Nieuwe leverancier">
      {(titleRef) => (
        <div>
          <h2 ref={titleRef} className="text-xl font-semibold px-5 pt-6 pb-2">
            Nieuwe leverancier
          </h2>
          <div className="px-5 py-6 space-y-5">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Naam *</label>
              <Input value={naam} onChange={(e) => setNaam(e.target.value)} placeholder="Leverancier naam" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Type</label>
              <NestoSelect options={typeOptions} value={type} onValueChange={setType} placeholder="Selecteer type" />
            </div>

            <div className="border-t border-border/50 pt-4" />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Contactpersoon</label>
                <Input value={contactpersoon} onChange={(e) => setContactpersoon(e.target.value)} placeholder="Naam" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@voorbeeld.nl" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Telefoon</label>
                <Input value={telefoon} onChange={(e) => setTelefoon(e.target.value)} placeholder="+31..." />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Klantnummer</label>
                <Input value={klantnummer} onChange={(e) => setKlantnummer(e.target.value)} placeholder="Optioneel" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Notities</label>
              <Textarea value={notities} onChange={(e) => setNotities(e.target.value)} placeholder="Optionele notities..." rows={2} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <NestoButton variant="ghost" onClick={onClose}>Annuleren</NestoButton>
              <NestoButton
                onClick={handleSubmit}
                disabled={!naam.trim()}
                isLoading={mutations.createLeverancier.isPending}
              >
                Opslaan
              </NestoButton>
            </div>
          </div>
        </div>
      )}
    </NestoPanel>
  );
}
