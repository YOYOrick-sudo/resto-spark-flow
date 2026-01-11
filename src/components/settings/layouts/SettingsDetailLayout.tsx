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
  actions?: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
}

export function SettingsDetailLayout({
  title,
  description,
  breadcrumbs,
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
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        {actions && <div className="flex-shrink-0">{actions}</div>}
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
