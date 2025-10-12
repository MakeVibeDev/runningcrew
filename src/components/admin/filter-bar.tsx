"use client";

import { ReactNode } from "react";

interface FilterOption {
  label: string;
  value: string;
}

interface FilterBarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: Array<{
    key: string;
    label: string;
    options: FilterOption[];
    value: string;
    onChange: (value: string) => void;
  }>;
  actions?: ReactNode;
  onClear?: () => void;
}

export function FilterBar({
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "검색...",
  filters = [],
  actions,
  onClear,
}: FilterBarProps) {
  const hasActiveFilters = searchValue || filters.some((f) => f.value !== "all");

  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* 검색 영역 */}
        <div className="flex flex-1 gap-3">
          {onSearchChange && (
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-lg border border-border bg-background px-4 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                🔍
              </span>
            </div>
          )}

          {/* 필터 드롭다운 */}
          {filters.map((filter) => (
            <select
              key={filter.key}
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">{filter.label}: 전체</option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ))}

          {/* 필터 초기화 버튼 */}
          {hasActiveFilters && onClear && (
            <button
              onClick={onClear}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              초기화
            </button>
          )}
        </div>

        {/* 액션 버튼 영역 */}
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
    </div>
  );
}
