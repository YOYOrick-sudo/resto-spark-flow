import { NestoCard } from "@/components/polar/NestoCard";
import { NestoButton } from "@/components/polar/NestoButton";
import { NestoBadge } from "@/components/polar/NestoBadge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Archive, Globe, Users } from "lucide-react";
import { useArchiveTableGroup } from "@/hooks/useTableGroups";
import type { TableGroup } from "@/types/reservations";

interface TableGroupCardProps {
  group: TableGroup;
  onEdit: () => void;
}

export function TableGroupCard({ group, onEdit }: TableGroupCardProps) {
  const { mutate: archiveGroup, isPending } = useArchiveTableGroup();

  const memberLabels = group.members
    ?.map(m => m.table?.display_label)
    .filter(Boolean)
    .join(' + ') || 'Geen tafels';

  const handleArchive = () => {
    archiveGroup({ groupId: group.id, locationId: group.location_id });
  };

  return (
    <NestoCard className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium">{group.name}</h4>
            {group.is_online_bookable && (
              <NestoBadge variant="outline" className="text-xs gap-1">
                <Globe className="h-3 w-3" />
                Online
              </NestoBadge>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground truncate">
            {memberLabels}
          </p>
          
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {group.combined_min_capacity}-{group.combined_max_capacity} pers
            </span>
            {group.notes && (
              <span className="truncate">{group.notes}</span>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <NestoButton variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </NestoButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>Bewerken</DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleArchive}
              disabled={isPending}
              className="text-destructive focus:text-destructive"
            >
              <Archive className="h-4 w-4 mr-2" />
              Archiveren
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </NestoCard>
  );
}
