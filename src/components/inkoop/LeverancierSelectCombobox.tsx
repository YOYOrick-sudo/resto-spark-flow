import { useState, useEffect, useMemo } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
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

interface Leverancier {
  id: string;
  naam: string;
}

interface Props {
  value: string | null;
  onChange: (id: string) => void;
  leveranciers: Leverancier[];
  disabled?: boolean;
  prefillNewName?: string | null;
  label?: string;
}

export function LeverancierSelectCombobox({
  value,
  onChange,
  leveranciers,
  disabled,
  prefillNewName,
  label = "Leverancier",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const selected = useMemo(
    () => leveranciers.find((l) => l.id === value) ?? null,
    [leveranciers, value]
  );

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
  const showCreate = trimmedQuery.length > 0 && !exactMatch;

  const handleCreated = (lev: { id: string; naam: string }) => {
    onChange(lev.id);
    setOpen(false);
    setQuery("");
    // Focus terug naar de pagina (trigger button blur is automatisch via popover sluit)
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
              <span className="truncate">
                {selected?.naam ?? "Selecteer of maak nieuwe leverancier..."}
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
                {leveranciers.length > 0 && (
                  <CommandGroup>
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
                )}
                {showCreate && (
                  <>
                    {leveranciers.length > 0 && <CommandSeparator />}
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
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <QuickCreateLeverancierDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        initialNaam={trimmedQuery}
        onCreated={handleCreated}
      />
    </>
  );
}
