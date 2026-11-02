import type { ReactNode } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  align?: "right";
  className?: string;
}

/** Scrolls inside its own card, so a wide table never pushes the page sideways on a phone. */
export function DataTable<T>({ rows, columns, rowKey, caption, onRowClick }: { rows: T[]; columns: Array<Column<T>>; rowKey: (row: T) => string; caption: string; onRowClick?: (row: T) => void }) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <Table>
        <caption className="sr-only">{caption}</caption>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead key={c.header} scope="col" className={cn(c.align === "right" && "text-right", c.className)}>
                {c.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={rowKey(row)} className={cn(onRowClick && "cursor-pointer")} onClick={onRowClick && (() => onRowClick(row))}>
              {columns.map((c) => (
                <TableCell key={c.header} className={cn(c.align === "right" && "tabular text-right", c.className)}>
                  {c.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
