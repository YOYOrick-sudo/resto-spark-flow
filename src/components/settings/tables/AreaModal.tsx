import { useState } from "react";
import { NestoModal } from "@/components/polar/NestoModal";
import { NestoInput } from "@/components/polar/NestoInput";
import { NestoSelect } from "@/components/polar/NestoSelect";
import { NestoButton } from "@/components/polar/NestoButton";
import { useCreateArea, useUpdateArea, getNextAreaSortOrder } from "@/hooks/useTableMutations";
import { parseSupabaseError } from "@/lib/supabaseErrors";
import { toast } from "sonner";
import type { Area, FillOrderType } from "@/types/reservations";

interface AreaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string | undefined;
  editingArea: Area | null;
}

const fillOrderOptions = [
  { value: 'first_available', label: 'Eerst beschikbaar' },
  { value: 'round_robin', label: 'Afwisselend' },
  { value: 'priority', label: 'Prioriteit' },
  { value: 'custom', label: 'Handmatig' },
];

export function AreaModal({ open, onOpenChange, locationId, editingArea }: AreaModalProps) {
  const [name, setName] = useState(editingArea?.name ?? '');
  const [fillOrder, setFillOrder] = useState<FillOrderType>(editingArea?.fill_order ?? 'first_available');
  const [error, setError] = useState('');
  
  const { mutate: createArea, isPending: isCreating } = useCreateArea();
  const { mutate: updateArea, isPending: isUpdating } = useUpdateArea();
  
  const isEditing = !!editingArea;
  const isPending = isCreating || isUpdating;

  // Reset form when modal opens/closes or editingArea changes
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setName(editingArea?.name ?? '');
      setFillOrder(editingArea?.fill_order ?? 'first_available');
      setError('');
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationId) {
      setError('Geen locatie geselecteerd. Herlaad de pagina.');
      return;
    }
    if (!name.trim()) return;
    
    setError('');
    
    try {
      if (isEditing) {
        updateArea(
          { id: editingArea.id, name: name.trim(), fill_order: fillOrder },
          {
            onSuccess: () => {
              toast.success('Area bijgewerkt');
              onOpenChange(false);
            },
            onError: (err) => {
              const parsed = parseSupabaseError(err);
              setError(parsed.message);
            }
          }
        );
      } else {
        const sortOrder = await getNextAreaSortOrder(locationId);
        createArea(
          { location_id: locationId, name: name.trim(), fill_order: fillOrder, sort_order: sortOrder },
          {
            onSuccess: () => {
              onOpenChange(false);
            },
            onError: (err) => {
              const parsed = parseSupabaseError(err);
              setError(parsed.message);
            }
          }
        );
      }
    } catch (err) {
      const parsed = parseSupabaseError(err);
      setError(parsed.message);
    }
  };

  return (
    <NestoModal
      open={open}
      onOpenChange={handleOpenChange}
      title={isEditing ? 'Area bewerken' : 'Nieuwe area'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <NestoInput
          label="Naam"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="bijv. Terras, Restaurant, Bar"
          error={error}
          autoFocus
        />
        
        <NestoSelect
          label="Toewijzingsvolgorde"
          value={fillOrder}
          onValueChange={(v) => setFillOrder(v as FillOrderType)}
          options={fillOrderOptions}
        />
        
        <div className="flex justify-end gap-2 pt-4">
          <NestoButton type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </NestoButton>
          <NestoButton type="submit" disabled={isPending || !name.trim()}>
            {isPending ? 'Opslaan...' : isEditing ? 'Opslaan' : 'Aanmaken'}
          </NestoButton>
        </div>
      </form>
    </NestoModal>
  );
}
