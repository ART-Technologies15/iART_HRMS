import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

/**
 * Reusable pagination control.
 *
 * Props:
 *  - pagination:
 *      {
 *        page,
 *        limit,
 *        total,
 *        totalPages,
 *        hasNextPage,
 *        hasPreviousPage
 *      }
 *  - onPageChange: (page) => void
 *  - className
 */
const Pagination = ({ pagination, onPageChange, className = "" }) => {
  if (!pagination || pagination.totalPages <= 1) return null;

  const {
    page = 1,
    limit = 20,
    total = 0,
    totalPages = 1,
    hasNextPage = false,
    hasPreviousPage = false,
  } = pagination;

  // Don't show pagination when there are no records
  if (total === 0) return null;

  // Build compact page list with ellipsis
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }

      return pages;
    }

    // Always show first page
    pages.push(1);

    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);

    // Left ellipsis
    if (start > 2) {
      pages.push("...");
    }

    // Middle pages
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    // Right ellipsis
    if (end < totalPages - 1) {
      pages.push("...");
    }

    // Always show last page
    pages.push(totalPages);

    return pages;
  };

  // Calculate record range
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div
      className={`flex flex-col items-center justify-between gap-3 px-5 py-4 sm:flex-row ${className}`}
    >
      {/* Record count */}
      <p className="text-sm text-slate-500">
        Showing <span className="font-semibold text-slate-700">{from}</span>–
        <span className="font-semibold text-slate-700">{to}</span> of{" "}
        <span className="font-semibold text-slate-700">{total}</span> records
      </p>

      {/* Pagination buttons */}
      <div className="flex items-center gap-1">
        {/* Previous */}
        <button
          type="button"
          onClick={() => {
            if (hasPreviousPage) {
              onPageChange(page - 1);
            }
          }}
          disabled={!hasPreviousPage}
          className="flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" />

          <span className="hidden sm:inline">Prev</span>
        </button>

        {/* Page numbers */}
        {getPageNumbers().map((pageNumber, index) =>
          pageNumber === "..." ? (
            <span
              key={`ellipsis-${index}`}
              className="flex h-9 w-9 items-center justify-center text-slate-400"
            >
              <MoreHorizontal className="h-4 w-4" />
            </span>
          ) : (
            <button
              type="button"
              key={pageNumber}
              onClick={() => onPageChange(pageNumber)}
              disabled={pageNumber === page}
              className={`flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors ${
                pageNumber === page
                  ? "bg-[#183C31] text-white"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {pageNumber}
            </button>
          ),
        )}

        {/* Next */}
        <button
          type="button"
          onClick={() => {
            if (hasNextPage) {
              onPageChange(page + 1);
            }
          }}
          disabled={!hasNextPage}
          className="flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="hidden sm:inline">Next</span>

          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
