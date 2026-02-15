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
  zebra?: boolean;
  className?: string;
}

export function NestoTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyMessage = "Geen gegevens beschikbaar",
  stickyHeader = false,
  zebra = true,
  className,
}: NestoTableProps<T>) {
  return (
    <div className={cn("w-full overflow-auto rounded-card border border-border", className)}>
      <Table>
        <TableHeader className={cn(stickyHeader && "sticky top-0 z-10")}>
          <TableRow className="bg-accent hover:bg-accent border-b border-border">
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={cn(
                  "h-11 px-4 text-label text-muted-foreground",
                  column.headerClassName
                )}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((item, index) => (
              <TableRow
                key={keyExtractor(item)}
                onClick={() => onRowClick?.(item)}
                className={cn(
                  "border-b border-border transition-colors",
                  onRowClick && "cursor-pointer",
                  zebra && index % 2 === 1 && "bg-accent/50",
                  "hover:bg-accent"
                )}
              >
                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    className={cn("px-4 py-3.5 text-secondary", column.className)}
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
