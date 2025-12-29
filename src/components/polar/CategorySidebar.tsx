import * as React from "react";
import { cn } from "@/lib/utils";

export interface CategoryItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
  badge?: string;
  disabled?: boolean;
}

export interface CategorySidebarProps {
  title?: string;
  items: CategoryItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  className?: string;
}

export function CategorySidebar({
  title,
  items,
  selectedId,
  onSelect,
  className,
}: CategorySidebarProps) {
  return (
    <aside
      className={cn(
        "w-60 shrink-0 border-r border-border bg-card",
        className
      )}
      style={{
        padding: "28px 24px",
      }}
    >
      {title && (
        <h4
          className="mb-4 text-label text-muted-foreground"
          style={{
            fontSize: "13px",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          {title}
        </h4>
      )}
      <nav
        className="flex flex-col"
        style={{ gap: "4px" }}
        role="listbox"
        aria-label={title}
      >
        {items.map((item) => {
          const isSelected = item.id === selectedId;

          return (
            <button
              key={item.id}
              onClick={() => !item.disabled && onSelect(item.id)}
              disabled={item.disabled}
              role="option"
              aria-selected={isSelected}
              className={cn(
                "flex w-full items-center justify-between text-left transition-all duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isSelected
                  ? "bg-accent text-foreground"
                  : "bg-transparent text-muted-foreground hover:bg-accent",
                item.disabled && "cursor-not-allowed opacity-50"
              )}
              style={{
                padding: "10px 12px",
                borderRadius: "8px",
                fontSize: "15px",
                fontWeight: isSelected ? 500 : 400,
              }}
            >
              <div className="flex items-center gap-2.5">
                {item.icon && (
                  <span className={cn(isSelected ? "text-primary" : "text-muted-foreground")}>
                    {item.icon}
                  </span>
                )}
                <span>{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {item.badge && (
                  <span
                    className="rounded-full bg-pending px-2 py-0.5 text-xs font-medium text-white"
                  >
                    {item.badge}
                  </span>
                )}
                {item.count !== undefined && (
                  <span
                    className={cn(
                      "text-small font-semibold",
                      isSelected ? "text-primary" : "text-muted-foreground"
                    )}
                    style={{ fontSize: "13px" }}
                  >
                    {item.count}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
