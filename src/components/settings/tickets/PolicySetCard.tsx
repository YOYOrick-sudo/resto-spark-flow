import { NestoCard } from "@/components/polar/NestoCard";
import { NestoBadge } from "@/components/polar/NestoBadge";
import {
  formatPaymentSummary,
  formatCancelSummary,
  formatNoshowSummary,
  formatReconfirmSummary,
} from "@/lib/policySetSummary";
import type { PolicySetWithMeta } from "@/hooks/usePolicySets";
import { CreditCard, CalendarX, UserX, Bell } from "lucide-react";

interface PolicySetCardProps {
  policySet: PolicySetWithMeta;
  onClick: () => void;
}

const SummaryRow = ({ icon: Icon, text }: { icon: React.ElementType; text: string }) => (
  <div className="flex items-center gap-2 text-sm text-muted-foreground">
    <Icon className="h-3.5 w-3.5 flex-shrink-0" />
    <span className="truncate">{text}</span>
  </div>
);

export function PolicySetCard({ policySet, onClick }: PolicySetCardProps) {
  return (
    <NestoCard
      hoverable
      className="p-5 cursor-pointer"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-base truncate">{policySet.name}</h3>
          {policySet.description && (
            <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
              {policySet.description}
            </p>
          )}
        </div>
        <NestoBadge variant="default">
          {policySet.ticketCount} ticket{policySet.ticketCount !== 1 ? "s" : ""}
        </NestoBadge>
      </div>

      {/* 4 regels samenvatting */}
      <div className="space-y-1.5">
        <SummaryRow icon={CreditCard} text={formatPaymentSummary(policySet)} />
        <SummaryRow icon={CalendarX} text={formatCancelSummary(policySet)} />
        <SummaryRow icon={UserX} text={formatNoshowSummary(policySet)} />
        <SummaryRow icon={Bell} text={formatReconfirmSummary(policySet)} />
      </div>
    </NestoCard>
  );
}
