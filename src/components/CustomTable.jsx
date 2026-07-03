import React, { useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsUpDown } from "lucide-react";

const CustomTable = ({
  columns = [],
  data = [],
  rowsPerPageOptions = [5, 10, 15, 20],
  defaultRowsPerPage = 10,
  onRowClick = null,
  footerLegend = [],
  tableClassName = "",
  thClassName = "",
  tdClassName = "",
  stickyCols = 0,
  stickyColWidth = 140,
  hidePagination = false,

  // Server-side / controlled pagination props
  currentPage: controlledPage,
  totalPages: controlledTotalPages,
  totalRecords,
  rowsPerPage: controlledRowsPerPage,
  onPageChange,
  onRowsPerPageChange,
}) => {
  // Internal state — only used when no controlled props are passed
  const [internalPage, setInternalPage] = useState(1);
  const [internalRowsPerPage, setInternalRowsPerPage] = useState(defaultRowsPerPage);

  // Decide: controlled (server-side) vs uncontrolled (client-side)
  const isControlled = typeof onPageChange === "function";

  const page = isControlled ? controlledPage : internalPage;
  const rowsPerPage = isControlled ? controlledRowsPerPage : internalRowsPerPage;
  const totalPages = isControlled
    ? controlledTotalPages
    : Math.max(1, Math.ceil(data.length / rowsPerPage));

  // In controlled mode, data is already the current page's slice from server
  // In uncontrolled mode, slice it client-side
  const paginatedData = isControlled
    ? data
    : data.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const effectiveRowsPerPage = hidePagination ? data.length : rowsPerPage;
  const finalPaginatedData = hidePagination ? data : paginatedData;

  const handlePrev = () => {
    if (isControlled) onPageChange(page - 1);
    else setInternalPage((p) => Math.max(p - 1, 1));
  };

  const handleNext = () => {
    if (isControlled) onPageChange(page + 1);
    else setInternalPage((p) => Math.min(p + 1, totalPages));
  };

  const handleRowsPerPageChange = (e) => {
    const value = Number(e.target.value);
    if (isControlled) {
      onRowsPerPageChange?.(value);
    } else {
      setInternalRowsPerPage(value);
      setInternalPage(1);
    }
  };

  const getThClasses = (col, idx) =>
    typeof thClassName === "function" ? thClassName(col, idx) : thClassName;

  const getTdClasses = (col, idx) =>
    typeof tdClassName === "function" ? tdClassName(col, idx) : tdClassName;

  const MobileCard = ({ row }) => (
    <div
      onClick={() => onRowClick?.(row)}
      className={`bg-white p-4 border-b border-slate-200 ${onRowClick ? "cursor-pointer active:bg-slate-50" : ""
        }`}
    >
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-slate-900 text-base">Record</h3>
      </div>

      {row.status && (
        <div className="my-2">
          <span
            className={`text-xs px-2 py-1 my-3 rounded-full whitespace-nowrap ${row.status === "Approved"
                ? "bg-green-100 text-green-700"
                : row.status === "Rejected"
                  ? "bg-red-100 text-red-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
          >
            {row.status}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-y-2">
        {columns.map((col, idx) => {
          const value = col.render
            ? col.render(row[col.accessor], row)
            : row[col.accessor];

          if (
            value === undefined ||
            value === null ||
            value === "" ||
            col.accessor === "name" ||
            col.accessor === "email" ||
            col.accessor === "status"
          ) {
            return null;
          }

          return (
            <div key={idx} className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">
                {col.label}
              </p>
              <div className="text-sm text-slate-700 break-words">{value}</div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table
          className={`w-full text-sm text-slate-700 ${tableClassName}`}
          style={{ borderCollapse: "separate", minWidth: "max-content" }}
        >
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {columns.map((col, idx) => {
                const isSticky = idx < stickyCols;
                const leftOffset = isSticky ? idx * stickyColWidth : undefined;
                const style = isSticky
                  ? {
                    position: "sticky",
                    left: leftOffset,
                    zIndex: 50 + idx,
                    background: "#f8fafc",
                  }
                  : undefined;

                return (
                  <th
                    key={idx}
                    className={`py-3 px-4 text-left font-semibold text-slate-600 whitespace-nowrap ${getThClasses(
                      col,
                      idx
                    )}`}
                    style={style}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      <ChevronsUpDown size={14} className="text-slate-400" />
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {finalPaginatedData.map((row, rIdx) => (
              <tr
                key={rIdx}
                className={`border-b border-slate-100 hover:bg-slate-50 transition ${onRowClick ? "cursor-pointer" : ""
                  }`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col, cIdx) => {
                  const isSticky = cIdx < stickyCols;
                  const leftOffset = isSticky ? cIdx * stickyColWidth : undefined;
                  const style = isSticky
                    ? {
                      position: "sticky",
                      left: leftOffset,
                      zIndex: 40 + cIdx,
                      background: "white",
                    }
                    : undefined;

                  return (
                    <td
                      key={cIdx}
                      className={`py-3 px-4 text-slate-700 whitespace-nowrap ${getTdClasses(
                        col,
                        cIdx
                      )}`}
                      style={style}
                    >
                      {col.render
                        ? col.render(row[col.accessor], row)
                        : row[col.accessor]}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden">
        {finalPaginatedData.map((row, idx) => (
          <MobileCard key={idx} row={row} />
        ))}
      </div>

      {/* Footer / Pagination */}
      {!hidePagination && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 text-sm text-slate-600 border-t border-slate-200">
          {footerLegend.length > 0 && (
            <div className="flex flex-wrap items-center gap-4">
              {footerLegend.map((item, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <span className={`w-3 h-3 rounded-full ${item.color}`} />
                  {item.label}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <span className="hidden sm:inline">Rows per page</span>

            <select
              className="border border-slate-300 rounded-md px-2 py-1 text-slate-700"
              value={rowsPerPage}
              onChange={handleRowsPerPageChange}
            >
              {rowsPerPageOptions.map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>

            <button
              onClick={handlePrev}
              disabled={page === 1}
              className={`p-1 rounded-md border ${page === 1
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:bg-slate-100"
                }`}
            >
              <ChevronLeft size={16} />
            </button>

            <span className="min-w-[4rem] text-center">
              {String(page).padStart(2, "0")} /{" "}
              {String(totalPages).padStart(2, "0")}
            </span>

            <button
              onClick={handleNext}
              disabled={page === totalPages}
              className={`p-1 rounded-md border ${page === totalPages
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:bg-slate-100"
                }`}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomTable;