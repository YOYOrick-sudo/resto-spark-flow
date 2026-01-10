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
    <div className="space-y-6">
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
          <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
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
                "group flex items-start gap-4 p-4 rounded-card border-[1.5px] border-border",
                "bg-card hover:bg-accent/50 transition-colors cursor-pointer"
              )}
            >
              {Icon && (
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                  {section.label}
                </h3>
                {section.description && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {section.description}
                  </p>
                )}
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 self-center" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
