import * as React from "react";
import { Link } from "react-router-dom";
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
  children: React.ReactNode;
}

export function SettingsPageLayout({
  module,
  sections,
  activeSection,
  onSectionChange,
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
        <div className="w-[240px] flex-shrink-0 space-y-4 sticky top-0 self-start">
          {/* Menu */}
          <nav className="bg-secondary rounded-card p-5">
            <h4 className="text-sm font-semibold text-foreground mb-4">
              CATEGORIEËN
            </h4>
            <ul className="space-y-1.5">
              {sections.map((section) => (
                <li key={section.id}>
                  <button
                    onClick={() => !section.disabled && onSectionChange(section.id)}
                    disabled={section.disabled}
                    className={cn(
                      "w-full text-left py-3 px-4 rounded-dropdown text-[15px] transition-all duration-150 border-[1.5px]",
                      section.disabled && "opacity-50 cursor-not-allowed",
                      activeSection === section.id
                        ? "text-primary font-semibold bg-selected-bg border-selected-border"
                        : "text-muted-foreground bg-transparent border-transparent hover:bg-accent/60"
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
