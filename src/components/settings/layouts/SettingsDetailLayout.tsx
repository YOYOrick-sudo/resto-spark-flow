/**
 * SETTINGS LAYOUT PRINCIPLE
 * ─────────────────────────
 * Toekomstige settings-pagina's zijn automatisch consistent zolang ze:
 *   1. SettingsDetailLayout als shell gebruiken
 *   2. SettingsCardHeader voor alle card-headers gebruiken
 *      (vervangt 4 historische varianten — text-lg / text-sm / text-base / [11px] uppercase)
 *   3. SettingsSaveIndicator voor save-feedback gebruiken
 *      (nestoToast alleen voor create / delete / bulk / send)
 *   4. De edit-flow beslisregel volgen
 *      ≤ 2 secties of ≤ 6 velden  → Slide-in Sheet (NestoPanel, 460px)
 *      3+ secties of 7+ velden    → Detail-pagina (eigen route)
 *      Bulk / single-action       → Dialog
 *      Snelle key-value edit      → Inline
 *
 * Typografie-hiërarchie:
 *   H1  pagina-titel    text-2xl   font-semibold   (DEZE component)
 *   H2  card-header     text-base  font-semibold   (SettingsCardHeader)
 *   H3  sectie-label    text-[11px] font-medium uppercase tracking-wider text-muted-foreground
 */

import { Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface BreadcrumbItemType {
  label: string;
  path?: string;
}

interface SettingsDetailLayoutProps {
  title: React.ReactNode;
  description?: string;
  breadcrumbs: BreadcrumbItemType[];
  /** Optional save-state indicator rendered to the left of `actions` in the title row. */
  saveIndicator?: React.ReactNode;
  actions?: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
}

export function SettingsDetailLayout({
  title,
  description,
  breadcrumbs,
  saveIndicator,
  actions,
  aside,
  children,
}: SettingsDetailLayoutProps) {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      {/* Breadcrumb - Full width */}
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <BreadcrumbItem key={crumb.label}>
                {!isLast && crumb.path ? (
                  <>
                    <BreadcrumbLink asChild>
                      <Link to={crumb.path}>{crumb.label}</Link>
                    </BreadcrumbLink>
                    <BreadcrumbSeparator />
                  </>
                ) : !isLast ? (
                  <>
                    <span className="text-muted-foreground">{crumb.label}</span>
                    <BreadcrumbSeparator />
                  </>
                ) : (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header - Full width */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold leading-tight">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        {(saveIndicator || actions) && (
          <div className="flex flex-shrink-0 items-center gap-3">
            {saveIndicator}
            {actions}
          </div>
        )}
      </div>

      {/* Content + Aside Grid */}
      {aside ? (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 xl:items-start">
          <div>{children}</div>
          <aside>{aside}</aside>
        </div>
      ) : (
        <div>{children}</div>
      )}
    </div>
  );
}
