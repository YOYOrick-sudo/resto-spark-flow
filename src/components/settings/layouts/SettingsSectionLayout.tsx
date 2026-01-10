import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { SettingsModuleConfig, SettingsSection } from "@/lib/settingsRouteConfig";

interface SettingsSectionLayoutProps {
  config: SettingsModuleConfig;
  section: SettingsSection;
  /** Optional custom count to display on subsection cards */
  counts?: Record<string, number>;
  /** Optional children to render instead of subsection cards (for leaf sections) */
  children?: React.ReactNode;
}

/**
 * Layout for Niveau 3: Section page with subsection cards or custom content
 */
export function SettingsSectionLayout({
  config,
  section,
  counts,
  children,
}: SettingsSectionLayoutProps) {
  const hasSubsections = section.subsections && section.subsections.length > 0;

  return (
    <div className="space-y-6">
      {/* Breadcrumb - Enterprise pattern: single navigation source */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/instellingen/voorkeuren">Settings</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to={config.basePath}>{config.label}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{section.label}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">{section.label}</h1>
        {section.description && (
          <p className="text-sm text-muted-foreground mt-1">{section.description}</p>
        )}
      </div>

      {/* Content: Subsection cards or children */}
      {hasSubsections ? (
        <div className="space-y-4 max-w-2xl">
          {section.subsections!.map((subsection) => {
            const Icon = subsection.icon;
            const count = counts?.[subsection.id];

            return (
              <Link
                key={subsection.id}
                to={subsection.path}
                className={cn(
                  "group flex items-center gap-4 p-5 rounded-card border-[1.5px] border-border",
                  "bg-card shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 cursor-pointer"
                )}
              >
                {Icon && (
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                      {subsection.label}
                    </h3>
                    {count !== undefined && (
                      <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-control font-medium">
                        {count}
                      </span>
                    )}
                  </div>
                  {subsection.description && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {subsection.description}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 group-hover:translate-x-0.5 group-hover:text-primary transition-all duration-200" />
              </Link>
            );
          })}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
