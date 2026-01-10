import { useState, useMemo, useEffect } from "react";
import { NestoModal } from "@/components/polar/NestoModal";
import { NestoInput } from "@/components/polar/NestoInput";
import { NestoButton } from "@/components/polar/NestoButton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useAreasForSettings } from "@/hooks/useAreasWithTables";
import { useTableGroups, useCreateTableGroup, useUpdateTableGroup, useAddTableGroupMember, useRemoveTableGroupMember } from "@/hooks/useTableGroups";
import { parseSupabaseError } from "@/lib/supabaseErrors";
import { getBaseCapacity, getCombinationCapacity, getMinExtraSeats, MAX_EXTRA_SEATS, validateExtraSeats } from "@/lib/tableCapacity";
import { toast } from "sonner";
import type { TableGroup } from "@/types/reservations";

interface TableGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string | undefined;
  editingGroup: TableGroup | null;
}

export function TableGroupModal({ open, onOpenChange, locationId, editingGroup }: TableGroupModalProps) {
  const [name, setName] = useState(editingGroup?.name ?? '');
  const [notes, setNotes] = useState(editingGroup?.notes ?? '');
  const [isOnlineBookable, setIsOnlineBookable] = useState(editingGroup?.is_online_bookable ?? true);
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
  const [extraSeats, setExtraSeats] = useState(editingGroup?.extra_seats ?? 0);
  const [error, setError] = useState('');
  
  const { data: allAreas } = useAreasForSettings(locationId);
  const { data: allGroups } = useTableGroups(locationId, { includeInactive: false, includeMembers: true });
  
  const { mutate: createGroup, isPending: isCreating } = useCreateTableGroup();
  const { mutate: updateGroup, isPending: isUpdating } = useUpdateTableGroup();
  const { mutate: addMember } = useAddTableGroupMember();
  const { mutate: removeMember } = useRemoveTableGroupMember();
  
  const isEditing = !!editingGroup;
  const isPending = isCreating || isUpdating;

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setName(editingGroup?.name ?? '');
      setNotes(editingGroup?.notes ?? '');
      setIsOnlineBookable(editingGroup?.is_online_bookable ?? true);
      setSelectedTableIds(editingGroup?.members?.map(m => m.table_id) ?? []);
      setExtraSeats(editingGroup?.extra_seats ?? 0);
      setError('');
    }
  }, [open, editingGroup]);

  // Build disabled table map: tableId -> reason
  const tableStateMap = useMemo(() => {
    const map = new Map<string, { disabled: boolean; reason?: string }>();
    
    allAreas?.flatMap(a => a.tables ?? []).forEach(table => {
      // Skip inactive tables entirely (not shown)
      if (!table.is_active) return;
      
      // Not joinable = disabled with reason
      if (!table.is_joinable) {
        map.set(table.id, { 
          disabled: true, 
          reason: 'Niet koppelbaar' 
        });
        return;
      }
      
      // In another active custom group = disabled with group name
      const existingGroup = allGroups?.find(g => 
        g.id !== editingGroup?.id &&
        g.is_active &&
        !g.is_system_generated &&
        g.members?.some(m => m.table_id === table.id)
      );
      
      if (existingGroup) {
        map.set(table.id, { 
          disabled: true, 
          reason: `In "${existingGroup.name}"` 
        });
        return;
      }
      
      // Available
      map.set(table.id, { disabled: false });
    });
    
    return map;
  }, [allAreas, allGroups, editingGroup?.id]);

  // Filter: alleen active tables tonen
  const selectableTables = useMemo(() => 
    allAreas?.flatMap(a => (a.tables ?? []).filter(t => t.is_active)) ?? [],
    [allAreas]
  );

  // Calculate selected tables for capacity calculation
  const selectedTables = useMemo(() => 
    selectableTables.filter(t => selectedTableIds.includes(t.id)),
    [selectableTables, selectedTableIds]
  );

  // Capacity calculations
  const baseCapacity = useMemo(() => getBaseCapacity(selectedTables), [selectedTables]);
  const effectiveCapacity = useMemo(() => getCombinationCapacity(selectedTables, extraSeats), [selectedTables, extraSeats]);
  const minExtraSeats = useMemo(() => getMinExtraSeats(baseCapacity), [baseCapacity]);

  // Reset extraSeats when tables change to stay within valid range
  useEffect(() => {
    if (extraSeats < minExtraSeats) {
      setExtraSeats(minExtraSeats);
    } else if (extraSeats > MAX_EXTRA_SEATS) {
      setExtraSeats(MAX_EXTRA_SEATS);
    }
  }, [minExtraSeats, extraSeats]);

  const toggleTable = (tableId: string) => {
    const state = tableStateMap.get(tableId);
    if (state?.disabled) return;
    
    setSelectedTableIds(prev => 
      prev.includes(tableId) 
        ? prev.filter(id => id !== tableId)
        : [...prev, tableId]
    );
  };

  const handleExtraSeatsChange = (value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num)) {
      setExtraSeats(0);
    } else {
      // Clamp to valid range
      const clamped = Math.max(minExtraSeats, Math.min(MAX_EXTRA_SEATS, num));
      setExtraSeats(clamped);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationId || !name.trim()) return;
    
    setError('');
    
    if (selectedTableIds.length < 2) {
      setError('Selecteer minimaal 2 tafels voor een groep.');
      return;
    }

    // Validate extra seats
    const validation = validateExtraSeats(selectedTables, extraSeats);
    if (!validation.valid) {
      setError(validation.message ?? 'Ongeldige extra stoelen waarde.');
      return;
    }
    
    try {
      if (isEditing) {
        // Update group details
        updateGroup(
          { 
            id: editingGroup.id, 
            name: name.trim(), 
            notes: notes.trim() || null,
            is_online_bookable: isOnlineBookable,
            extra_seats: extraSeats 
          },
          {
            onSuccess: async () => {
              // Update members
              const currentMemberIds = editingGroup.members?.map(m => m.table_id) ?? [];
              const toAdd = selectedTableIds.filter(id => !currentMemberIds.includes(id));
              const toRemove = currentMemberIds.filter(id => !selectedTableIds.includes(id));
              
              // Remove old members
              for (const tableId of toRemove) {
                const memberId = editingGroup.members?.find(m => m.table_id === tableId)?.id;
                if (memberId) {
                  removeMember({ memberId, locationId: editingGroup.location_id });
                }
              }
              
              // Add new members
              for (const tableId of toAdd) {
                addMember({ 
                  table_group_id: editingGroup.id, 
                  table_id: tableId,
                  locationId: editingGroup.location_id
                });
              }
              
              toast.success('Groep bijgewerkt');
              onOpenChange(false);
            },
            onError: (err) => {
              const parsed = parseSupabaseError(err);
              setError(parsed.message);
            }
          }
        );
      } else {
        // Create new group
        createGroup(
          { 
            location_id: locationId, 
            name: name.trim(),
            notes: notes.trim() || null,
            is_online_bookable: isOnlineBookable,
            extra_seats: extraSeats,
            table_ids: selectedTableIds
          },
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
      onOpenChange={onOpenChange}
      title={isEditing ? 'Groep bewerken' : 'Nieuwe tafelcombinatie'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <NestoInput
          label="Naam"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="bijv. Grote Tafel, Feesttafel"
          autoFocus
        />
        
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Notities (optioneel)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Extra informatie over deze groep..."
            rows={2}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="is_online_bookable" className="text-sm font-medium">
              Online boekbaar
            </Label>
            <p className="text-xs text-muted-foreground">
              Deze combinatie kan online geboekt worden.
            </p>
          </div>
          <Switch
            id="is_online_bookable"
            checked={isOnlineBookable}
            onCheckedChange={setIsOnlineBookable}
          />
        </div>
        
        {/* Table selection */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Tafels selecteren (min. 2)</Label>
          <div className="border rounded-lg max-h-48 overflow-y-auto p-3 space-y-2">
            {selectableTables.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">
                Geen tafels beschikbaar.
              </p>
            ) : (
              selectableTables.map(table => {
                const state = tableStateMap.get(table.id);
                const isDisabled = state?.disabled ?? false;
                const isChecked = selectedTableIds.includes(table.id);
                
                return (
                  <div 
                    key={table.id} 
                    className={`flex items-center gap-2 ${isDisabled ? 'opacity-50' : ''}`}
                  >
                    <Checkbox
                      id={table.id}
                      disabled={isDisabled}
                      checked={isChecked}
                      onCheckedChange={() => toggleTable(table.id)}
                    />
                    <label 
                      htmlFor={table.id} 
                      className={`flex-1 text-sm ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      {table.display_label} ({table.min_capacity}-{table.max_capacity} pers)
                    </label>
                    {state?.reason && (
                      <span className="text-xs text-muted-foreground">{state.reason}</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Capacity section - only show when tables are selected */}
        {selectedTableIds.length >= 2 && (
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <Label className="text-sm font-medium">Capaciteit</Label>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Basis capaciteit</span>
              <span className="font-medium">{baseCapacity} personen</span>
            </div>
            
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <Label htmlFor="extra_seats" className="text-sm text-muted-foreground">
                  Extra stoelen
                </Label>
              </div>
              <input
                id="extra_seats"
                type="number"
                value={extraSeats}
                onChange={(e) => handleExtraSeatsChange(e.target.value)}
                min={minExtraSeats}
                max={MAX_EXTRA_SEATS}
                step={1}
                className="w-20 h-9 px-3 rounded-md border border-input bg-background text-sm text-center focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            
            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Effectieve capaciteit</span>
                <span className="font-semibold text-primary">{effectiveCapacity} personen</span>
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                Corrigeer het aantal stoelen voor deze combinatie. 
                Negatief als er stoelen wegvallen door de opstelling. 
                Positief als je stoelen kunt bijzetten.
              </p>
              <p className="italic">2 + 2 met stoelen erbij: +2</p>
              <p className="italic">4 + 4 met verlies kopse kanten: -2</p>
            </div>
          </div>
        )}
        
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        
        <div className="flex justify-end gap-2 pt-4">
          <NestoButton type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </NestoButton>
          <NestoButton type="submit" disabled={isPending || !name.trim() || selectedTableIds.length < 2}>
            {isPending ? 'Opslaan...' : isEditing ? 'Opslaan' : 'Aanmaken'}
          </NestoButton>
        </div>
      </form>
    </NestoModal>
  );
}
