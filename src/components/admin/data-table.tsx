"use client";

import { ReactNode, useState } from "react";

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  emptyMessage = "데이터가 없습니다",
  onRowClick,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const handleSort = (key: string, sortable?: boolean) => {
    if (!sortable) return;

    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortKey) return 0;

    const aValue = (a as Record<string, unknown>)[sortKey];
    const bValue = (b as Record<string, unknown>)[sortKey];

    if (aValue === bValue) return 0;

    // Type guard for comparison - convert to string for safe comparison
    const aStr = String(aValue ?? '');
    const bStr = String(bValue ?? '');
    const comparison = aStr > bStr ? 1 : -1;
    return sortOrder === "asc" ? comparison : -comparison;
  });

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-background">
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">로딩 중...</div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-background">
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">{emptyMessage}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 text-left text-sm font-medium ${
                    column.sortable ? "cursor-pointer select-none hover:bg-muted" : ""
                  }`}
                  style={{ width: column.width }}
                  onClick={() => handleSort(column.key, column.sortable)}
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {column.sortable && (
                      <span className="text-xs text-muted-foreground">
                        {sortKey === column.key ? (
                          sortOrder === "asc" ? (
                            "↑"
                          ) : (
                            "↓"
                          )
                        ) : (
                          "↕"
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((item) => (
              <tr
                key={keyExtractor(item)}
                className={`border-b border-border last:border-0 ${
                  onRowClick
                    ? "cursor-pointer hover:bg-muted/30 transition-colors"
                    : ""
                }`}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 text-sm">
                    {column.render
                      ? column.render(item)
                      : String((item as Record<string, unknown>)[column.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
