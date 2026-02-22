import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown, ChevronsUpDown, LucideIcon } from "lucide-react";
import { EmptyState } from "./EmptyState";

// ============================================================================
// Types
// ============================================================================

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  sortable?: boolean;
}

export interface DataTablePagination {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  emptyIcon?: LucideIcon;
  stickyHeader?: boolean;
  className?: string;

  // Sorting
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (column: string, direction: "asc" | "desc") => void;

  // Pagination
  pagination?: DataTablePagination;

  // Selection
  selectable?: boolean;
  selectedRows?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
}

// ============================================================================
// Component
// ============================================================================

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyMessage = "Geen gegevens gevonden",
  emptyIcon,
  stickyHeader = false,
  className,
  sortColumn,
  sortDirection,
  onSort,
  pagination,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
}: DataTableProps<T>) {
  // Handle header click for sorting
  const handleSort = (column: DataTableColumn<T>) => {
    if (!column.sortable || !onSort) return;

    const newDirection =
      sortColumn === column.key && sortDirection === "asc" ? "desc" : "asc";
    onSort(column.key, newDirection);
  };

  // Handle row selection
  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    if (checked) {
      onSelectionChange(data.map(keyExtractor));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (!onSelectionChange) return;
    if (checked) {
      onSelectionChange([...selectedRows, id]);
    } else {
      onSelectionChange(selectedRows.filter((rowId) => rowId !== id));
    }
  };

  const allSelected = data.length > 0 && selectedRows.length === data.length;
  const someSelected = selectedRows.length > 0 && selectedRows.length < data.length;

  // Pagination calculations
  const totalPages = pagination
    ? Math.ceil(pagination.totalItems / pagination.pageSize)
    : 1;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="w-full overflow-auto rounded-2xl bg-card shadow-card">
        <Table>
          <TableHeader className={cn(stickyHeader && "sticky top-0 z-10 bg-card")}>
            <TableRow className="border-none hover:bg-transparent">
              {selectable && (
                <TableHead className="w-12 px-4 pb-2">
                  <Checkbox
                    checked={allSelected}
                    ref={(el) => {
                      if (el) {
                        (el as unknown as HTMLInputElement).indeterminate = someSelected;
                      }
                    }}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  onClick={() => handleSort(column)}
                  className={cn(
                    "px-4 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground",
                    column.sortable && onSort && "cursor-pointer select-none hover:text-foreground transition-colors",
                    column.headerClassName
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{column.header}</span>
                    {column.sortable && onSort && (
                      <span className="flex-shrink-0">
                        {sortColumn === column.key ? (
                          sortDirection === "asc" ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
                        )}
                      </span>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border/50">
            {data.length === 0 ? (
              <TableRow className="border-none">
                <TableCell
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="h-48"
                >
                  <EmptyState
                    icon={emptyIcon}
                    title={emptyMessage}
                    size="sm"
                  />
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => {
                const id = keyExtractor(item);
                const isSelected = selectedRows.includes(id);

                return (
                  <TableRow
                    key={id}
                    onClick={() => onRowClick?.(item)}
                    className={cn(
                      "border-none transition-colors duration-150",
                      onRowClick && "cursor-pointer",
                      isSelected && "bg-primary/5",
                      "hover:bg-muted/30"
                    )}
                  >
                    {selectable && (
                      <TableCell className="w-12 px-4">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) =>
                            handleSelectRow(id, checked as boolean)
                          }
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                    )}
                    {columns.map((column) => (
                      <TableCell
                        key={column.key}
                        className={cn("px-4 py-3.5 text-sm", column.className)}
                      >
                        {column.render
                          ? column.render(item)
                          : (item[column.key] as React.ReactNode)}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-muted-foreground">
            {pagination.totalItems} resultaten
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage <= 1}
              className={cn(
                "flex items-center justify-center h-9 px-3 rounded-lg text-sm font-medium transition-colors",
                pagination.currentPage <= 1
                  ? "text-muted-foreground cursor-not-allowed"
                  : "text-foreground hover:bg-accent"
              )}
            >
              Vorige
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((page) => {
                const current = pagination.currentPage;
                return (
                  page === 1 ||
                  page === totalPages ||
                  (page >= current - 1 && page <= current + 1)
                );
              })
              .map((page, index, arr) => (
                <React.Fragment key={page}>
                  {index > 0 && arr[index - 1] !== page - 1 && (
                    <span className="px-2 text-muted-foreground">...</span>
                  )}
                  <button
                    onClick={() => pagination.onPageChange(page)}
                    className={cn(
                      "flex items-center justify-center h-9 w-9 rounded-lg text-sm font-medium transition-colors",
                      page === pagination.currentPage
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-accent"
                    )}
                  >
                    {page}
                  </button>
                </React.Fragment>
              ))}

            <button
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage >= totalPages}
              className={cn(
                "flex items-center justify-center h-9 px-3 rounded-lg text-sm font-medium transition-colors",
                pagination.currentPage >= totalPages
                  ? "text-muted-foreground cursor-not-allowed"
                  : "text-foreground hover:bg-accent"
              )}
            >
              Volgende
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
