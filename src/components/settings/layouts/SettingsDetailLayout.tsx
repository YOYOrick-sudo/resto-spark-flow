import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface SettingsDetailLayoutProps {
  title: string;
  description?: string;
  /** Back navigation target */
  backTo: string;
  /** Label for back button (e.g., "Tafelbeheer") */
  backLabel: string;
  /** Breadcrumb items */
  breadcrumbs: BreadcrumbItem[];
  /** Optional action buttons for header */
  actions?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Layout for Niveau 4: Detail/list pages with focused content
 */
export function SettingsDetailLayout({
  title,
  description,
  backTo,
  backLabel,
  breadcrumbs,
  actions,
  children,
}: SettingsDetailLayoutProps) {
  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        to={backTo}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Terug naar {backLabel}
      </Link>

      {/* Breadcrumb */}
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

      {/* Header with optional actions */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {actions && <div className="flex-shrink-0">{actions}</div>}
      </div>

      {/* Content */}
      <div>{children}</div>
    </div>
  );
}
