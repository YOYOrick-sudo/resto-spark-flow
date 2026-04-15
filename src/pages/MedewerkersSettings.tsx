import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { NestoButton, NestoInput, Spinner } from "@/components/polar";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Check, X } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  useMedewerkers, useCreateMedewerker, useUpdateMedewerker,
} from "@/hooks/useMedewerkers";

const ROL_OPTIONS = ["Kok", "Sous-chef", "Chef-kok", "Afwasser", "Bediening", "Eigenaar", "Overig"];

type Filter = "actief" | "inactief" | "alle";

export default function MedewerkersSettings() {
  const [filter, setFilter] = useState<Filter>("actief");
  const { data: medewerkers = [], isLoading } = useMedewerkers(false);
  const createMedewerker = useCreateMedewerker();
  const updateMedewerker = useUpdateMedewerker();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [naam, setNaam] = useState("");
  const [rol, setRol] = useState("Kok");
  const [email, setEmail] = useState("");

  const filtered = medewerkers.filter((m) => {
    if (filter === "actief") return m.is_actief;
    if (filter === "inactief") return !m.is_actief;
    return true;
  });

  const handleCreate = () => {
    if (!naam.trim()) return;
    createMedewerker.mutate({ naam: naam.trim(), rol, email: email.trim() || undefined }, {
      onSuccess: () => { setShowForm(false); setNaam(""); setRol("Kok"); setEmail(""); },
    });
  };

  const startEdit = (m: typeof medewerkers[0]) => {
    setEditId(m.id);
    setNaam(m.naam);
    setRol(m.rol ?? "Kok");
    setEmail(m.email ?? "");
  };

  const handleUpdate = () => {
    if (!editId || !naam.trim()) return;
    updateMedewerker.mutate({ id: editId, naam: naam.trim(), rol, email: email.trim() || undefined }, {
      onSuccess: () => { setEditId(null); setNaam(""); setRol("Kok"); setEmail(""); },
    });
  };

  const cancelEdit = () => {
    setEditId(null);
    setShowForm(false);
    setNaam("");
    setRol("Kok");
    setEmail("");
  };

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink asChild><Link to="/instellingen/voorkeuren">Instellingen</Link></BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink asChild><Link to="/instellingen/keuken">Keuken</Link></BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>Medewerkers</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="max-w-[720px] mx-auto">
        <div className="flex items-center justify-between pb-6">
          <div>
            <h1 className="text-h1 text-foreground">Medewerkers</h1>
            <p className="text-body text-muted-foreground mt-1">
              Keukenmedewerkers verschijnen op labels, bij MEP taken en HACCP registraties.
            </p>
          </div>
          <NestoButton onClick={() => { setShowForm(true); setEditId(null); setNaam(""); setRol("Kok"); setEmail(""); }}>
            <Plus className="h-4 w-4 mr-1" />
            Nieuw
          </NestoButton>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-4">
          {(["actief", "inactief", "alle"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                filter === f
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary/50"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* New medewerker form */}
        {showForm && !editId && (
          <div className="bg-card border border-border rounded-lg p-4 mb-4 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <NestoInput placeholder="Naam *" value={naam} onChange={(e) => setNaam(e.target.value)} />
              <Select value={rol} onValueChange={setRol}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROL_OPTIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
              <NestoInput placeholder="Email (optioneel)" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="flex gap-2 justify-end">
              <NestoButton variant="outline" size="sm" onClick={cancelEdit}><X className="h-3.5 w-3.5" /></NestoButton>
              <NestoButton size="sm" onClick={handleCreate} disabled={!naam.trim() || createMedewerker.isPending}>
                <Check className="h-3.5 w-3.5 mr-1" />Toevoegen
              </NestoButton>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            {filter === "actief" ? "Nog geen medewerkers. Voeg er een toe!" : "Geen medewerkers gevonden."}
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium px-4 py-3">Naam</th>
                  <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium px-4 py-3">Rol</th>
                  <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-medium px-4 py-3">Email</th>
                  <th className="text-center text-[11px] uppercase tracking-wider text-muted-foreground font-medium px-4 py-3">Actief</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id} className="border-b border-border/50 last:border-0">
                    {editId === m.id ? (
                      <>
                        <td className="px-4 py-2">
                          <NestoInput value={naam} onChange={(e) => setNaam(e.target.value)} className="h-9" />
                        </td>
                        <td className="px-4 py-2">
                          <Select value={rol} onValueChange={setRol}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {ROL_OPTIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-2">
                          <NestoInput value={email} onChange={(e) => setEmail(e.target.value)} className="h-9" />
                        </td>
                        <td className="px-4 py-2 text-center" />
                        <td className="px-4 py-2">
                          <div className="flex gap-1">
                            <button onClick={cancelEdit} className="p-1 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
                            <button onClick={handleUpdate} className="p-1 text-primary hover:text-primary/80"><Check className="h-3.5 w-3.5" /></button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-sm font-medium text-foreground">{m.naam}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{m.rol ?? "—"}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{m.email ?? "—"}</td>
                        <td className="px-4 py-3 text-center">
                          <Switch
                            checked={m.is_actief}
                            onCheckedChange={(checked) => updateMedewerker.mutate({ id: m.id, is_actief: checked })}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => startEdit(m)} className="p-1 text-muted-foreground hover:text-foreground">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
