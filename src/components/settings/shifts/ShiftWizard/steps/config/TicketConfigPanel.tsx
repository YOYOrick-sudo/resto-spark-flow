import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { NestoBadge } from "@/components/polar/NestoBadge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { ShiftTicketOverrides } from "../../ShiftWizardContext";
import type { TicketWithMeta } from "@/hooks/useTickets";
import type { AreaWithTables } from "@/types/reservations";
import type { ArrivalInterval } from "@/types/shifts";
import { ConfigTabs, type ConfigTabId } from "./ConfigTabs";
import { BasisTab } from "./BasisTab";
import { CapaciteitTab } from "./CapaciteitTab";
import { GeavanceerdTab } from "./GeavanceerdTab";

function countOverrides(o: ShiftTicketOverrides | undefined): number {
  if (!o) return 0;
  let count = 0;
  if (o.overrideDuration !== null) count++;
  if (o.overrideBuffer !== null) count++;
  if (o.overrideMinParty !== null) count++;
  if (o.overrideMaxParty !== null) count++;
  if (o.pacingLimit !== null) count++;
  if (o.seatingLimitGuests !== null) count++;
  if (o.seatingLimitReservations !== null) count++;
  if (o.ignorePacing) count++;
  if (o.areas !== null) count++;
  if (o.showAreaName) count++;
  if (o.squeezeEnabled) count++;
  if (o.showEndTime) count++;
  if (o.waitlistEnabled) count++;
  return count;
}

interface TicketConfigPanelProps {
  ticket: TicketWithMeta;
  overrides: ShiftTicketOverrides | undefined;
  areas: AreaWithTables[];
  arrivalInterval: ArrivalInterval;
  isSingle: boolean;
  defaultOpen: boolean;
  onSetOverride: (field: keyof ShiftTicketOverrides, value: any) => void;
}

function TicketTabContent({
  activeTab,
  ticket,
  overrides,
  areas,
  arrivalInterval,
  onSetOverride,
}: {
  activeTab: ConfigTabId;
  ticket: TicketWithMeta;
  overrides: ShiftTicketOverrides | undefined;
  areas: AreaWithTables[];
  arrivalInterval: ArrivalInterval;
  onSetOverride: (field: keyof ShiftTicketOverrides, value: any) => void;
}) {
  switch (activeTab) {
    case "basis":
      return <BasisTab ticket={ticket} overrides={overrides} onSetOverride={onSetOverride} />;
    case "capaciteit":
      return <CapaciteitTab ticket={ticket} overrides={overrides} areas={areas} arrivalInterval={arrivalInterval} onSetOverride={onSetOverride} />;
    case "geavanceerd":
      return <GeavanceerdTab overrides={overrides} onSetOverride={onSetOverride} />;
  }
}

export function TicketConfigPanel({ ticket, overrides, areas, arrivalInterval, isSingle, defaultOpen, onSetOverride }: TicketConfigPanelProps) {
  const [activeTab, setActiveTab] = useState<ConfigTabId>("basis");
  const [open, setOpen] = useState(defaultOpen);
  const overrideCount = countOverrides(overrides);

  const content = (
    <div className="space-y-1">
      <ConfigTabs activeTab={activeTab} onTabChange={setActiveTab} />
      <TicketTabContent
        activeTab={activeTab}
        ticket={ticket}
        overrides={overrides}
        areas={areas}
        arrivalInterval={arrivalInterval}
        onSetOverride={onSetOverride}
      />
    </div>
  );

  // Single ticket: render directly without collapsible
  if (isSingle) {
    return (
      <div className="border border-border rounded-dropdown p-4 bg-secondary/20">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ticket.color }} />
          <span className="text-sm font-medium">{ticket.display_title}</span>
          {overrideCount > 0 && (
            <NestoBadge variant="outline" className="text-xs">
              {overrideCount} override{overrideCount !== 1 ? "s" : ""}
            </NestoBadge>
          )}
        </div>
        {content}
      </div>
    );
  }

  // Multiple tickets: collapsible
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-full flex items-center gap-2 p-3 rounded-dropdown border border-border transition-all text-left",
            open
              ? "bg-secondary/40 border-l-2 border-l-primary"
              : "bg-secondary/20 hover:bg-secondary/40"
          )}
        >
          {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ticket.color }} />
          <span className="text-sm font-medium flex-1">{ticket.display_title}</span>
          {overrideCount > 0 && (
            <NestoBadge variant="outline" className="text-xs">
              {overrideCount} override{overrideCount !== 1 ? "s" : ""}
            </NestoBadge>
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border border-t-0 border-border rounded-b-dropdown p-4">
          {content}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
