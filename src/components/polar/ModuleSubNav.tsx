import { NavLink, useLocation } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarState } from "@/contexts/SidebarStateContext";

export interface ModuleSubNavItem {
  path: string;
  label: string;
  icon?: LucideIcon;
}

export interface ModuleSubNavProps {
  items: ModuleSubNavItem[];
  className?: string;
}

/**
 * Horizontale tab-navigatie binnen een module. Active state matcht exact OF
 * startsWith voor sub-routes (bv. /voorraad/123 highlight "Ingrediënten").
 *
 * CONVENTION: ModuleSubNav rendert ALTIJD bovenaan de pagina, vóór de PageHeader.
 * Hiërarchie: ModuleSubNav (module-scope tabs) → PageHeader (tab-scope titel +
 * acties) → content. Reden: acties zoals "+ Nieuw" horen bij de huidige tab,
 * niet bij de hele module. GitHub/Shopify pattern.
 *
 * Eigen bottom-margin (mb-8 md:mb-10) zorgt voor 32-40px scheiding zonder dat
 * expanded-sidebar mode lege ruimte krijgt — bij expanded returnt component
 * null en is er geen DOM, dus geen marge.
 *
 * Wordt verborgen wanneer de hoofd-sidebar expanded is — in dat geval toont
 * de sidebar al alle sub-items inline en zou de sub-nav dubbele navigatie
 * opleveren.
 *
 * Fade-edges worden gerealiseerd met een wrapper + gradient overlays (geen
 * CSS mask) voor maximale Safari iOS compatibiliteit.
 */
export function ModuleSubNav({ items, className }: ModuleSubNavProps) {
  const { pathname } = useLocation();
  const { collapsed } = useSidebarState();

  // Verberg sub-nav wanneer sidebar uitgeklapt is (sidebar toont al sub-items).
  if (!collapsed) return null;

  // Sorteer paden van langst naar kortst voor exacte match-prioriteit.
  // Een sub-route als /kaartbeheer/menus mag niet ook /kaartbeheer activeren.
  const sortedPaths = [...items.map((i) => i.path)].sort((a, b) => b.length - a.length);
  const matchedPath = sortedPaths.find(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  return (
    <div className={cn("relative -mx-2 mb-8 md:mb-10", className)}>
      {/* Fade-edges moeten pagina-bg matchen (bg-card = wit), anders tonen ze als grijs vlak */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 z-10 bg-gradient-to-r from-card to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 z-10 bg-gradient-to-l from-card to-transparent"
      />

      <nav
        className="flex items-center gap-1 overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Module navigatie"
      >
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = matchedPath === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              role="tab"
              aria-selected={isActive}
              className={cn(
                "relative flex items-center gap-2 px-4 min-h-[44px] text-sm font-medium whitespace-nowrap rounded-md transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              {Icon ? <Icon className="h-4 w-4" aria-hidden /> : null}
              <span>{item.label}</span>
              {isActive && (
                <span
                  aria-hidden
                  className="absolute left-3 right-3 -bottom-px h-0.5 bg-primary rounded-full"
                />
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
