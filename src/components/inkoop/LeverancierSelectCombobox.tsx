import { useState, useEffect, useMemo } from "react";
import { Check, ChevronsUpDown, Plus, Sparkles } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { QuickCreateLeverancierDialog } from "./QuickCreateLeverancierDialog";
import { useUserContext } from "@/contexts/UserContext";

interface Leverancier {
  id: string;
  naam: string;
}

export interface FuzzyKandidaat {
  id: string;
  naam: string;
  similarity: number;
}

interface Props {
  value: string | null;
  onChange: (id: string) => void;
  leveranciers: Leverancier[];
  disabled?: boolean;
  prefillNewName?: string | null;
  label?: string;
  /** Fuzzy match-suggesties uit parse-factuur (similarity >= 0.5). Max 3. */
  fuzzyKandidaten?: FuzzyKandidaat[];
}

// Rollen die nieuwe leveranciers mogen aanmaken (komt overeen met RLS).
const CAN_CREATE_ROLES: Array<string> = ["owner", "manager"];

export function LeverancierSelectCombobox({
  value,
  onChange,
  leveranciers,
  disabled,
  prefillNewName,
  label = "Leverancier",
  fuzzyKandidaten = [],
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const { context } = useUserContext();

  const canCreate = useMemo(() => {
    if (!context) return false;
    if (context.is_platform_admin) return true;
    return context.role ? CAN_CREATE_ROLES.includes(context.role) : false;
  }, [context]);

  const selected = useMemo(
    () => leveranciers.find((l) => l.id === value) ?? null,
    [leveranciers, value]
  );

  // Filter fuzzy-kandidaten: alleen tonen als (a) geen waarde geselecteerd
  // en (b) niet al exact in leveranciers-lijst aanwezig (hierdoor zou anders dubbeling ontstaan).
  const fuzzyToShow = useMemo(() => {
    if (value || !fuzzyKandidaten?.length) return [];
    return fuzzyKandidaten.slice(0, 3);
  }, [value, fuzzyKandidaten]);

  // Pre-fill query met AI-naam als geen waarde geselecteerd is en popover opent
  useEffect(() => {
    if (open && !value && prefillNewName && !query) {
      setQuery(prefillNewName);
    }
  }, [open, value, prefillNewName, query]);

  const trimmedQuery = query.trim();
  const exactMatch = leveranciers.find(
    (l) => l.naam.toLowerCase() === trimmedQuery.toLowerCase()
  );
  const showCreate = canCreate && trimmedQuery.length > 0 && !exactMatch;

  const handleCreated = (lev: { id: string; naam: string }) => {
    onChange(lev.id);
    setOpen(false);
    setQuery("");
  };

  return (
    <>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground block">{label}</label>
        <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(""); }}>
          <PopoverTrigger asChild>
            <button
              type="button"
              role="combobox"
              aria-expanded={open}
              disabled={disabled}
              className={cn(
                "h-9 w-full flex items-center justify-between rounded-button border-[1.5px] border-border bg-background px-3 py-2 text-sm",
                "hover:bg-muted/30 focus:outline-none focus:border-primary transition-colors",
                "disabled:cursor-not-allowed disabled:opacity-60",
                !selected && "text-muted-foreground"
              )}
            >
              <span className="truncate flex items-center gap-2">
                {selected?.naam ?? "Selecteer of maak nieuwe leverancier..."}
                {!selected && fuzzyToShow.length > 0 && (
                  <Sparkles className="h-3 w-3 text-primary" aria-label="Suggesties beschikbaar" />
                )}
              </span>
              <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 ml-2 opacity-50" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="p-0 w-[--radix-popover-trigger-width] min-w-[280px]"
            align="start"
          >
            <Command shouldFilter={true}>
              <CommandInput
                placeholder="Zoek leverancier..."
                value={query}
                onValueChange={setQuery}
              />
              <CommandList>
                <CommandEmpty>
                  {trimmedQuery ? "Geen leveranciers gevonden." : "Begin met typen..."}
                </CommandEmpty>

                {/* Fuzzy-suggesties (alleen bij geen selectie) */}
                {fuzzyToShow.length > 0 && (
                  <CommandGroup heading="Lijkt op herkende naam">
                    {fuzzyToShow.map((k) => (
                      <CommandItem
                        key={`fuzzy-${k.id}`}
                        value={`__fuzzy__${k.naam}`}
                        onSelect={() => {
                          onChange(k.id);
                          setOpen(false);
                          setQuery("");
                        }}
                      >
                        <Sparkles className="mr-2 h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="truncate">{k.naam}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {leveranciers.length > 0 && (
                  <>
                    {fuzzyToShow.length > 0 && <CommandSeparator />}
                    <CommandGroup heading={fuzzyToShow.length > 0 ? "Alle leveranciers" : undefined}>
                      {leveranciers.map((l) => (
                        <CommandItem
                          key={l.id}
                          value={l.naam}
                          onSelect={() => {
                            onChange(l.id);
                            setOpen(false);
                            setQuery("");
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-3.5 w-3.5",
                              value === l.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="truncate">{l.naam}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </>
                )}

                {showCreate && (
                  <>
                    {(leveranciers.length > 0 || fuzzyToShow.length > 0) && <CommandSeparator />}
                    <CommandGroup>
                      <CommandItem
                        value={`__create__${trimmedQuery}`}
                        onSelect={() => {
                          setOpen(false);
                          setCreateOpen(true);
                        }}
                        className="text-primary"
                      >
                        <Plus className="mr-2 h-3.5 w-3.5" />
                        <span className="truncate">
                          Nieuwe leverancier aanmaken: <strong>"{trimmedQuery}"</strong>
                        </span>
                      </CommandItem>
                    </CommandGroup>
                  </>
                )}

                {!canCreate && trimmedQuery.length > 0 && !exactMatch && (
                  <div className="px-3 py-2 text-xs text-muted-foreground border-t">
                    Vraag een manager om "{trimmedQuery}" als nieuwe leverancier toe te voegen.
                  </div>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {canCreate && (
        <QuickCreateLeverancierDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          initialNaam={trimmedQuery}
          onCreated={handleCreated}
        />
      )}
    </>
  );
}
