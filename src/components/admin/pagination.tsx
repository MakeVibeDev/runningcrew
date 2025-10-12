"use client";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
}: PaginationProps) {
  const pages = [];
  const maxVisiblePages = 5;

  const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  const adjustedStartPage = endPage - startPage + 1 < maxVisiblePages
    ? Math.max(1, endPage - maxVisiblePages + 1)
    : startPage;

  for (let i = adjustedStartPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-between border-t border-border bg-background px-4 py-3 sm:px-6">
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="relative inline-flex items-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          이전
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="relative ml-3 inline-flex items-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          다음
        </button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          {totalItems !== undefined && itemsPerPage !== undefined && (
            <p className="text-sm text-muted-foreground">
              전체 <span className="font-medium">{totalItems}</span>개 중{" "}
              <span className="font-medium">
                {(currentPage - 1) * itemsPerPage + 1}
              </span>
              -
              <span className="font-medium">
                {Math.min(currentPage * itemsPerPage, totalItems)}
              </span>
              개 표시
            </p>
          )}
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-l-md border border-border bg-background px-2 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="sr-only">이전</span>
              ←
            </button>

            {adjustedStartPage > 1 && (
              <>
                <button
                  onClick={() => onPageChange(1)}
                  className="relative inline-flex items-center border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  1
                </button>
                {adjustedStartPage > 2 && (
                  <span className="relative inline-flex items-center border border-border bg-background px-4 py-2 text-sm font-medium">
                    ...
                  </span>
                )}
              </>
            )}

            {pages.map((page) => (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`relative inline-flex items-center border border-border px-4 py-2 text-sm font-medium ${
                  page === currentPage
                    ? "z-10 bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400"
                    : "bg-background hover:bg-muted"
                }`}
              >
                {page}
              </button>
            ))}

            {endPage < totalPages && (
              <>
                {endPage < totalPages - 1 && (
                  <span className="relative inline-flex items-center border border-border bg-background px-4 py-2 text-sm font-medium">
                    ...
                  </span>
                )}
                <button
                  onClick={() => onPageChange(totalPages)}
                  className="relative inline-flex items-center border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  {totalPages}
                </button>
              </>
            )}

            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center rounded-r-md border border-border bg-background px-2 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="sr-only">다음</span>
              →
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
