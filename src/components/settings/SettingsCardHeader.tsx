import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * SettingsCardHeader
 *
 * Uniforme card-header voor ALLE NestoCards binnen settings-pagina's.
 * Vervangt 4 historische varianten (text-lg/text-sm/text-base/text-[11px] uppercase)
 * met één strikt typografie-systeem.
 *
 * Hierarchie binnen settings (zie SettingsDetailLayout principe-statement):
 *   H1  pagina-titel    text-2xl  font-semibold   (SettingsDetailLayout)
 *   H2  card-header     text-base font-semibold   (DEZE component)
 *   H3  sectie-label    text-[11px] font-medium uppercase tracking-wider text-muted-foreground
 *
 * Slots:
 *   - title          → verplicht (renders als H2)
 *   - description    → optioneel beschrijvende regel onder titel
 *   - helpText       → optioneel slot (bv. TitleHelp tooltip), naast titel
 *   - actions        → optionele rechts uitgelijnde slot (knoppen, tabs)
 *   - saveIndicator  → optionele rechts uitgelijnde slot (SettingsSaveIndicator)
 *
 * Layout: titel + helpText links, actions + saveIndicator rechts. Description onder.
 */

interface SettingsCardHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  helpText?: React.ReactNode;
  actions?: React.ReactNode;
  saveIndicator?: React.ReactNode;
  /** Override default mb-4 spacing under header. */
  className?: string;
  /** Render as a different heading level if needed for SEO/a11y. Defaults to h2. */
  as?: "h2" | "h3";
}

export function SettingsCardHeader({
  title,
  description,
  helpText,
  actions,
  saveIndicator,
  className,
  as: Heading = "h2",
}: SettingsCardHeaderProps) {
  const hasRightSlot = Boolean(actions || saveIndicator);

  return (
    <div className={cn("mb-4", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Heading className="text-base font-semibold text-foreground leading-tight">
              {title}
            </Heading>
            {helpText && <span className="flex-shrink-0">{helpText}</span>}
          </div>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground leading-snug">
              {description}
            </p>
          )}
        </div>
        {hasRightSlot && (
          <div className="flex flex-shrink-0 items-center gap-3">
            {saveIndicator}
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * SettingsSectionLabel
 *
 * H3-equivalent binnen een card. Voor het groeperen van velden binnen
 * eenzelfde card. Strikt 11px uppercase tracking-wider.
 */
interface SettingsSectionLabelProps {
  children: React.ReactNode;
  className?: string;
}

export function SettingsSectionLabel({
  children,
  className,
}: SettingsSectionLabelProps) {
  return (
    <h3
      className={cn(
        "text-[11px] font-medium uppercase tracking-wider text-muted-foreground",
        className
      )}
    >
      {children}
    </h3>
  );
}
