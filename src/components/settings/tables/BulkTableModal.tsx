import { useState } from "react";
import { NestoModal } from "@/components/polar/NestoModal";
import { NestoInput } from "@/components/polar/NestoInput";
import { NestoNumericInput } from "@/components/polar/NestoNumericInput";
import { NestoButton } from "@/components/polar/NestoButton";
import { useCreateTablesBulk, getNextTableSortOrder } from "@/hooks/useTableMutations";
import { parseSupabaseError } from "@/lib/supabaseErrors";

interface BulkTableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  areaId: string;
}

export function BulkTableModal({ open, onOpenChange, areaId }: BulkTableModalProps) {
  const [startNumber, setStartNumber] = useState(1);
  const [count, setCount] = useState(5);
  const [minCapacity, setMinCapacity] = useState(2);
  const [maxCapacity, setMaxCapacity] = useState(4);
  const [error, setError] = useState('');
  
  const { mutate: createTablesBulk, isPending } = useCreateTablesBulk();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!areaId) return;
    
    setError('');
    
    if (count < 1 || count > 50) {
      setError('Aantal moet tussen 1 en 50 liggen.');
      return;
    }
    
    if (minCapacity > maxCapacity) {
      setError('Minimum capaciteit kan niet groter zijn dan maximum.');
      return;
    }
    
    try {
      // Get starting sort_order
      const baseSortOrder = await getNextTableSortOrder(areaId);
      
      // Create table data
      const tables = Array.from({ length: count }, (_, i) => ({
        area_id: areaId,
        table_number: startNumber + i,
        min_capacity: minCapacity,
        max_capacity: maxCapacity,
        sort_order: baseSortOrder + (i * 10),
      }));
      
      createTablesBulk(tables, {
        onSuccess: () => {
          onOpenChange(false);
          // Reset form
          setStartNumber(1);
          setCount(5);
        },
        onError: (err) => {
          const parsed = parseSupabaseError(err);
          setError(parsed.message);
        }
      });
    } catch (err) {
      const parsed = parseSupabaseError(err);
      setError(parsed.message);
    }
  };

  return (
    <NestoModal
      open={open}
      onOpenChange={onOpenChange}
      title="Meerdere tafels toevoegen"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Voeg meerdere tafels tegelijk toe met oplopende nummers.
        </p>
        
        <div className="grid grid-cols-2 gap-4">
          <NestoNumericInput
            label="Startnummer"
            min={1}
            integer
            value={startNumber}
            onValueChange={(v) => setStartNumber(v ?? 1)}
            allowEmpty={false}
            fallback={1}
          />
          <NestoNumericInput
            label="Aantal tafels"
            min={1}
            max={50}
            integer
            value={count}
            onValueChange={(v) => setCount(v ?? 1)}
            allowEmpty={false}
            fallback={1}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <NestoNumericInput
            label="Min. capaciteit"
            min={1}
            max={50}
            integer
            value={minCapacity}
            onValueChange={(v) => setMinCapacity(v ?? 1)}
            allowEmpty={false}
            fallback={1}
          />
          <NestoNumericInput
            label="Max. capaciteit"
            min={1}
            max={50}
            integer
            value={maxCapacity}
            onValueChange={(v) => setMaxCapacity(v ?? 1)}
            allowEmpty={false}
            fallback={1}
          />
        </div>
        
        <p className="text-xs text-muted-foreground">
          Dit maakt tafels {startNumber} t/m {startNumber + count - 1} aan.
        </p>
        
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        
        <div className="flex justify-end gap-2 pt-4">
          <NestoButton type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </NestoButton>
          <NestoButton type="submit" disabled={isPending}>
            {isPending ? 'Aanmaken...' : `${count} tafels aanmaken`}
          </NestoButton>
        </div>
      </form>
    </NestoModal>
  );
}
