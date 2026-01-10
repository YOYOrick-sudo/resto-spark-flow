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
import type { SettingsModuleConfig } from "@/lib/settingsRouteConfig";

interface SettingsModuleLayoutProps {
  config: SettingsModuleConfig;
}

/**
 * Layout for Niveau 2: Module index page with section cards
 */
export function SettingsModuleLayout({ config }: SettingsModuleLayoutProps) {
  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/instellingen/voorkeuren">Settings</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{config.label}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">{config.label}</h1>
        {config.description && (
          <p className="text-sm text-muted-foreground mt-0.5">{config.description}</p>
        )}
      </div>

      {/* Section Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
        {config.sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.id}
              to={section.path}
              className={cn(
                "group flex items-center gap-4 py-3 px-4 rounded-card border border-border",
                "bg-card hover:bg-accent/50 transition-all duration-200 cursor-pointer"
              )}
            >
              {Icon && (
                <div className="flex-shrink-0 w-8 h-8 rounded-md bg-primary/5 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                  {section.label}
                </h3>
                {section.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {section.description}
                  </p>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 self-center group-hover:translate-x-0.5 group-hover:text-primary transition-all duration-200" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
