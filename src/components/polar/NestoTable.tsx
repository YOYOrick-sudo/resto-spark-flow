import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface NestoTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  stickyHeader?: boolean;
  className?: string;
}

export function NestoTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyMessage = "Geen gegevens beschikbaar",
  stickyHeader = false,
  className,
}: NestoTableProps<T>) {
  return (
    <div className={cn("w-full overflow-auto rounded-2xl bg-card shadow-card", className)}>
      <Table>
        <TableHeader className={cn(stickyHeader && "sticky top-0 z-10 bg-card")}>
          <TableRow className="border-none hover:bg-transparent">
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={cn(
                  "px-4 pb-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider",
                  column.headerClassName
                )}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-border/50">
          {data.length === 0 ? (
            <TableRow className="border-none">
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((item) => (
              <TableRow
                key={keyExtractor(item)}
                onClick={() => onRowClick?.(item)}
                className={cn(
                  "border-none transition-colors duration-150",
                  onRowClick && "cursor-pointer",
                  "hover:bg-muted/30"
                )}
              >
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
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
