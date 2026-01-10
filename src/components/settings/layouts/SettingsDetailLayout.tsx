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
  title: string;
  description?: string;
  /** Breadcrumb items */
  breadcrumbs: BreadcrumbItemType[];
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
  breadcrumbs,
  actions,
  children,
}: SettingsDetailLayoutProps) {
  return (
    <div className="space-y-6">
      {/* Breadcrumb - Enterprise pattern: single navigation source */}
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
