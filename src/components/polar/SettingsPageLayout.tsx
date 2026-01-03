import * as React from "react";
import { Link } from "react-router-dom";
import { Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export interface SettingsSection {
  id: string;
  label: string;
  disabled?: boolean;
}

export interface SettingsPageLayoutProps {
  module: string;
  sections: SettingsSection[];
  activeSection: string;
  onSectionChange: (id: string) => void;
  infoMessage?: string;
  children: React.ReactNode;
}

export function SettingsPageLayout({
  module,
  sections,
  activeSection,
  onSectionChange,
  infoMessage,
  children,
}: SettingsPageLayoutProps) {
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
            <BreadcrumbPage>{module}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Main Layout */}
      <div className="flex gap-8">
        {/* Sidebar */}
        <div className="w-[240px] flex-shrink-0 space-y-4">
          {/* Info Card */}
          {infoMessage && (
            <div className="bg-card border border-border rounded-card-sm p-4">
              <div className="flex gap-3">
                <Lightbulb className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">{infoMessage}</p>
              </div>
            </div>
          )}

          {/* Menu */}
          <nav className="bg-secondary rounded-card p-5">
            <ul className="space-y-1">
              {sections.map((section) => (
                <li key={section.id}>
                  <button
                    onClick={() => !section.disabled && onSectionChange(section.id)}
                    disabled={section.disabled}
                    className={cn(
                      "w-full text-left py-2.5 px-3 rounded-button text-[15px] transition-colors",
                      section.disabled && "opacity-50 cursor-not-allowed",
                      activeSection === section.id
                        ? "text-primary font-medium"
                        : "text-muted-foreground hover:bg-accent"
                    )}
                  >
                    {section.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}
