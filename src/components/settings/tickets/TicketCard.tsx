import { MoreVertical, Star, Copy, Link2, Archive, Pencil } from "lucide-react";
import { NestoBadge } from "@/components/polar/NestoBadge";
import { NestoCard } from "@/components/polar/NestoCard";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TicketWithMeta } from "@/hooks/useTickets";

interface TicketCardProps {
  ticket: TicketWithMeta;
  onEdit: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
}

const priceFormatter = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
});

function getPricingBadge(ticket: TicketWithMeta) {
  if (!ticket.policyInfo || ticket.policyInfo.payment_type === "none") {
    return { text: "Geen betaling", variant: "default" as const };
  }
  const amount = priceFormatter.format((ticket.policyInfo.payment_amount_cents ?? 0) / 100);
  switch (ticket.policyInfo.payment_type) {
    case "deposit":
      return { text: `${amount} p.p. deposit`, variant: "primary" as const };
    case "full_prepay":
      return { text: `${amount} p.p. prepay`, variant: "primary" as const };
    case "no_show_guarantee":
      return { text: `No-show fee ${amount}`, variant: "warning" as const };
    default:
      return { text: "Geen betaling", variant: "default" as const };
  }
}

export function TicketCard({ ticket, onEdit, onDuplicate, onArchive }: TicketCardProps) {
  const pricing = getPricingBadge(ticket);
  const isNotBookable = ticket.status === "active" && ticket.shiftCount === 0;

  const handleCopyLink = async () => {
    if (ticket.friend_url_token) {
      const { copyToClipboard } = await import('@/lib/clipboard');
      await copyToClipboard(ticket.friend_url_token);
    }
  };

  return (
    <NestoCard className="overflow-hidden">
      {/* Hero */}
      <AspectRatio ratio={16 / 9}>
        {ticket.image_url ? (
          <img
            src={ticket.image_url}
            alt={ticket.display_title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="h-full w-full"
            style={{
              background: `linear-gradient(135deg, ${ticket.color}, ${ticket.color}88)`,
            }}
          />
        )}
        {ticket.is_highlighted && (
          <div className="absolute top-2 left-2">
            <Star className="h-5 w-5 text-warning fill-warning" />
          </div>
        )}
      </AspectRatio>

      {/* Body */}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-lg truncate">{ticket.display_title}</h3>
            {ticket.short_description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {ticket.short_description}
              </p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex-shrink-0 rounded-sm p-1 hover:bg-accent">
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-2" /> Bewerken
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="h-4 w-4 mr-2" /> Dupliceren
              </DropdownMenuItem>
              {ticket.friend_url_token && (
                <DropdownMenuItem onClick={handleCopyLink}>
                  <Link2 className="h-4 w-4 mr-2" /> Deellink kopiëren
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={onArchive}
                disabled={ticket.is_default}
                title={ticket.is_default ? "Default ticket kan niet gearchiveerd worden" : undefined}
                className="text-destructive focus:text-destructive"
              >
                <Archive className="h-4 w-4 mr-2" /> Archiveren
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          <NestoBadge variant={ticket.status === "active" ? "success" : "default"}>
            {ticket.status === "active" ? "Actief" : "Draft"}
          </NestoBadge>
          <NestoBadge variant={pricing.variant}>{pricing.text}</NestoBadge>
          {isNotBookable && (
            <NestoBadge variant="warning">Niet boekbaar</NestoBadge>
          )}
        </div>

        {/* Shift count */}
        <p className={`text-xs ${ticket.shiftCount === 0 ? "text-warning" : "text-muted-foreground"}`}>
          {ticket.shiftCount === 0
            ? "Geen shifts"
            : `${ticket.shiftCount} shift${ticket.shiftCount !== 1 ? "s" : ""}`}
        </p>
      </div>
    </NestoCard>
  );
}
