import { ChevronRight, ChevronLeft, Loader2 } from "lucide-react";

interface Column<T> {
  key: string;
  headerAr: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  pagination?: Pagination;
  onPageChange?: (page: number) => void;
  isLoading?: boolean;
  emptyMessageAr?: string;
  onRowClick?: (row: T) => void;
}

export default function DataTable<T extends Record<string, any>>({
  columns, data, pagination, onPageChange, isLoading, emptyMessageAr = "لا توجد بيانات", onRowClick,
}: DataTableProps<T>) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" dir="rtl">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              {columns.map((col) => (
                <th key={col.key} className={`px-4 py-3 text-right font-semibold text-muted-foreground text-xs uppercase tracking-wider ${col.className ?? ""}`}>
                  {col.headerAr}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-16">
                  <Loader2 size={24} className="mx-auto animate-spin text-muted-foreground" />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-16 text-muted-foreground">
                  {emptyMessageAr}
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr
                  key={row.id ?? i}
                  className={`border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors ${onRowClick ? "cursor-pointer" : ""}`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 ${col.className ?? ""}`}>
                      {col.render ? col.render(row) : String(row[col.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20" dir="rtl">
          <div className="text-xs text-muted-foreground">
            إجمالي {pagination.total.toLocaleString("ar-SA")} سجل
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1.5 rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
            <span className="text-xs px-3 py-1 rounded bg-primary text-primary-foreground font-medium">
              {pagination.page}
            </span>
            <span className="text-xs text-muted-foreground">/ {pagination.totalPages}</span>
            <button
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-1.5 rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
