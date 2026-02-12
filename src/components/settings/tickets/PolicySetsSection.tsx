import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, ChevronRight, Archive, Loader2, Plus } from "lucide-react";
import { usePolicySets, useArchivePolicySet, useRestorePolicySet } from "@/hooks/usePolicySets";
import { PolicySetCard } from "./PolicySetCard";
import { PolicySetDetailSheet } from "./PolicySetDetailSheet";
import { EmptyState } from "@/components/polar/EmptyState";
import { NestoButton } from "@/components/polar/NestoButton";
import { ConfirmDialog } from "@/components/polar/ConfirmDialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

interface PolicySetsSectionProps {
  locationId: string;
}

export function PolicySetsSection({ locationId }: PolicySetsSectionProps) {
  const navigate = useNavigate();
  const { data, isLoading } = usePolicySets(locationId);
  const { mutate: archivePolicy, isPending: isArchiving } = useArchivePolicySet(locationId);
  const { mutate: restorePolicy } = useRestorePolicySet(locationId);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [archivedOpen, setArchivedOpen] = useState(false);

  // Archive confirmation state
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [archiveTargetId, setArchiveTargetId] = useState<string | null>(null);
  const [blockedDialogOpen, setBlockedDialogOpen] = useState(false);
  const [blockedCount, setBlockedCount] = useState(0);
  const [blockedTicketNames, setBlockedTicketNames] = useState<Array<{ id: string; name: string }>>([]);

  const activePolicySets = data?.activePolicySets ?? [];
  const archivedPolicySets = data?.archivedPolicySets ?? [];

  const handleAdd = () => {
    setEditingId(null);
    setSheetOpen(true);
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    setSheetOpen(true);
  };

  const handleArchiveAttempt = (id: string) => {
    const ps = activePolicySets.find((p) => p.id === id);
    if (!ps) return;

    if (ps.ticketCount > 0) {
      // Block — show linked tickets
      setBlockedCount(ps.ticketCount);
      // We don't have ticket names in the list view, so just show count
      setBlockedTicketNames([]);
      setBlockedDialogOpen(true);
    } else {
      setArchiveTargetId(id);
      setArchiveConfirmOpen(true);
    }
  };

  const handleArchiveConfirm = () => {
    if (!archiveTargetId) return;
    archivePolicy(archiveTargetId, {
      onSuccess: () => {
        setArchiveConfirmOpen(false);
        setArchiveTargetId(null);
      },
      onError: (err) => {
        if (err.message?.startsWith("LINKED_TICKETS:")) {
          const count = parseInt(err.message.split(":")[1]) || 0;
          setBlockedCount(count);
          setBlockedDialogOpen(true);
        }
        setArchiveConfirmOpen(false);
        setArchiveTargetId(null);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activePolicySets.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="Nog geen beleid"
          description="Maak je eerste betalings- en annuleringsbeleid aan."
          action={{ label: "Eerste beleid aanmaken", onClick: handleAdd, icon: Plus }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activePolicySets.map((ps) => (
            <PolicySetCard
              key={ps.id}
              policySet={ps}
              onClick={() => handleEdit(ps.id)}
            />
          ))}
        </div>
      )}

      {/* Gearchiveerd */}
      {archivedPolicySets.length > 0 && (
        <Collapsible open={archivedOpen} onOpenChange={setArchivedOpen} className="mt-6 bg-muted/30 rounded-lg p-4">
          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2">
            <ChevronRight className={`h-4 w-4 transition-transform ${archivedOpen ? "rotate-90" : ""}`} />
            <Archive className="h-4 w-4" />
            Gearchiveerd ({archivedPolicySets.length})
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-2">
            {archivedPolicySets.map((ps) => (
              <div key={ps.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <span className="text-sm font-medium">{ps.name}</span>
                  {ps.description && (
                    <span className="text-xs text-muted-foreground ml-2">({ps.description})</span>
                  )}
                </div>
                <NestoButton size="sm" variant="ghost" onClick={() => restorePolicy(ps.id)}>
                  Herstellen
                </NestoButton>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Detail Sheet */}
      <PolicySetDetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        locationId={locationId}
        policySetId={editingId}
      />

      {/* Archive Confirm Dialog */}
      <ConfirmDialog
        open={archiveConfirmOpen}
        onOpenChange={setArchiveConfirmOpen}
        title="Beleid archiveren"
        description="Dit beleid wordt gearchiveerd. Je kunt het later herstellen."
        confirmLabel="Archiveren"
        onConfirm={handleArchiveConfirm}
        variant="destructive"
        isLoading={isArchiving}
      />

      {/* Blocked Dialog — linked tickets */}
      <AlertDialog open={blockedDialogOpen} onOpenChange={setBlockedDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Beleid kan niet gearchiveerd worden</AlertDialogTitle>
            <AlertDialogDescription>
              Dit beleid is gekoppeld aan {blockedCount} actieve ticket{blockedCount !== 1 ? "s" : ""}.
              Koppel deze tickets eerst aan een ander beleid voordat je dit beleid archiveert.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setBlockedDialogOpen(false)}>
              Begrepen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
