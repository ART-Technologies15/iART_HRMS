import React, { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  Inbox,
  ChevronDown,
} from "lucide-react";

// ── Design tokens ─────────────────────────────────────────────
// ink      #0B1220  primary text / headers
// slate    #47556A  body text
// muted    #94A3B8  captions, disabled
// line     #E2E8F0  grid lines (rows + columns)
// canvas   #F8FAFC  header bg / zebra tint
// surface  #FFFFFF  base
// brand    #0FBAFB  accent (matches HRMS identity)
// brandDeep#0A9FD8  active/hover accent
// brandSoft#E5FAFF  hover fill, active page pill

const buildPageRange = (current, total) => {
  const delta = 1;
  const range = [];
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      range.push(i);
    }
  }
  const withDots = [];
  let last = null;
  range.forEach((i) => {
    if (last !== null) {
      if (i - last === 2) withDots.push(last + 1);
      else if (i - last > 2) withDots.push("dots-" + i);
    }
    withDots.push(i);
    last = i;
  });
  return withDots;
};

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
  const [internalPage, setInternalPage] = useState(1);
  const [internalRowsPerPage, setInternalRowsPerPage] = useState(defaultRowsPerPage);
  const [jumpValue, setJumpValue] = useState("");

  const isControlled = typeof onPageChange === "function";

  const page = isControlled ? controlledPage : internalPage;
  const rowsPerPage = isControlled ? controlledRowsPerPage : internalRowsPerPage;
  const totalPages = isControlled
    ? Math.max(1, controlledTotalPages || 1)
    : Math.max(1, Math.ceil(data.length / rowsPerPage));

  const paginatedData = isControlled
    ? data
    : data.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const finalPaginatedData = hidePagination ? data : paginatedData;

  const totalCount = isControlled ? totalRecords ?? data.length : data.length;
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * rowsPerPage + 1;
  const rangeEnd = Math.min(page * rowsPerPage, totalCount || page * rowsPerPage);

  const goToPage = (num) => {
    const clamped = Math.min(Math.max(1, num), totalPages);
    if (isControlled) onPageChange(clamped);
    else setInternalPage(clamped);
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

  const handleJumpSubmit = (e) => {
    e.preventDefault();
    const num = Number(jumpValue);
    if (num >= 1 && num <= totalPages) goToPage(num);
    setJumpValue("");
  };

  const pageRange = useMemo(() => buildPageRange(page, totalPages), [page, totalPages]);

  const getThClasses = (col, idx) =>
    typeof thClassName === "function" ? thClassName(col, idx) : thClassName;
  const getTdClasses = (col, idx) =>
    typeof tdClassName === "function" ? tdClassName(col, idx) : tdClassName;

  const isEmpty = finalPaginatedData.length === 0;

  const MobileRow = ({ row }) => (
    <div
      onClick={() => onRowClick?.(row)}
      className={`px-4 py-5 ${onRowClick ? "cursor-pointer active:bg-[#F8FAFC]" : ""}`}
      style={{ borderBottom: "1px solid #E2E8F0" }}
    >
      <div className="grid grid-cols-2 gap-x-4 gap-y-4">
        {columns.map((col, idx) => {
          const value = col.render ? col.render(row[col.accessor], row) : row[col.accessor];
          if (value === undefined || value === null || value === "") return null;
          return (
            <div key={idx} className="min-w-0">
              <p
                className="text-[9.5px] font-semibold uppercase tracking-wider mb-0.5"
                style={{ color: "#94A3B8" }}
              >
                {col.label}
              </p>
              <div className="text-[13px] font-medium break-words" style={{ color: "#0B1220" }}>
                {value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div
      className="bg-white rounded-lg border overflow-hidden"
      style={{ borderColor: "#E2E8F0" }}
    >
      {/* Desktop / Tablet Table */}
      <div className="hidden xl:block overflow-x-auto">
        <table
          className={`w-full text-sm ${tableClassName}`}
          style={{ borderCollapse: "separate", borderSpacing: 0, minWidth: "max-content" }}
        >
          <thead>
            <tr>
              {columns.map((col, idx) => {
                const isSticky = idx < stickyCols;
                const leftOffset = isSticky ? idx * stickyColWidth : undefined;
                return (
                  <th
                    key={idx}
                    className={`group py-3 px-4 text-left font-semibold whitespace-nowrap select-none ${getThClasses(
                      col,
                      idx
                    )}`}
                    style={{
                      backgroundColor: "#F8FAFC",
                      color: "#0B1220",
                      borderBottom: "2px solid #E2E8F0",
                      borderRight: idx < columns.length - 1 ? "1px solid #E2E8F0" : "none",
                      fontSize: "11px",
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      ...(isSticky
                        ? { position: "sticky", left: leftOffset, zIndex: 30 }
                        : {}),
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      {col.label}
                      <ChevronsUpDown
                        size={12}
                        className="opacity-0 group-hover:opacity-70 transition-opacity"
                        style={{ color: "#0FBAFB" }}
                      />
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {finalPaginatedData.map((row, rIdx) => {
              const zebra = rIdx % 2 === 1;
              return (
                <tr
                  key={rIdx}
                  onClick={() => onRowClick?.(row)}
                  className={onRowClick ? "cursor-pointer" : ""}
                  style={{ backgroundColor: zebra ? "#F8FAFC" : "#FFFFFF" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#E5FAFF")}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = zebra ? "#F8FAFC" : "#FFFFFF")
                  }
                >
                  {columns.map((col, cIdx) => {
                    const isSticky = cIdx < stickyCols;
                    const leftOffset = isSticky ? cIdx * stickyColWidth : undefined;
                    const value = col.render ? col.render(row[col.accessor], row) : row[col.accessor];

                    return (
                      <td
                        key={cIdx}
                        className={`py-4 px-4 whitespace-nowrap tabular-nums ${getTdClasses(
                          col,
                          cIdx
                        )}`}
                        style={{
                          color: "#334155",
                          borderBottom: "1px solid #E2E8F0",
                          borderRight: cIdx < columns.length - 1 ? "1px solid #EEF2F7" : "none",
                          backgroundColor: "inherit",
                          ...(isSticky
                            ? { position: "sticky", left: leftOffset, zIndex: 20 }
                            : {}),
                        }}
                      >
                        {value}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>

        {isEmpty && (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0" }}
            >
              <Inbox size={16} style={{ color: "#94A3B8" }} />
            </div>
            <p className="text-sm font-medium" style={{ color: "#0B1220" }}>
              No records found
            </p>
            <p className="text-xs" style={{ color: "#94A3B8" }}>
              Try adjusting your filters or check back later.
            </p>
          </div>
        )}
      </div>

      {/* Mobile List */}
      <div className="xl:hidden">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-14 gap-2 px-4">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0" }}
            >
              <Inbox size={16} style={{ color: "#94A3B8" }} />
            </div>
            <p className="text-sm font-medium text-center" style={{ color: "#0B1220" }}>
              No records found
            </p>
          </div>
        ) : (
          finalPaginatedData.map((row, idx) => <MobileRow key={idx} row={row} />)
        )}
      </div>

      {/* Footer / Pagination */}
      {!hidePagination && (
        <div
          className="flex flex-col gap-3 px-4 py-3"
          style={{ borderTop: "1px solid #E2E8F0", backgroundColor: "#FCFDFE" }}
        >
          {footerLegend.length > 0 && (
            <div className="flex flex-wrap items-center gap-4 text-xs" style={{ color: "#47556A" }}>
              {footerLegend.map((item, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${item.color}`} />
                  {item.label}
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Record count */}
            <p className="text-xs order-2 sm:order-1" style={{ color: "#94A3B8" }}>
              {totalCount === 0 ? (
                "No results"
              ) : (
                <>
                  Showing <span style={{ color: "#0B1220", fontWeight: 600 }}>{rangeStart}–{rangeEnd}</span>{" "}
                  of <span style={{ color: "#0B1220", fontWeight: 600 }}>{totalCount}</span>
                </>
              )}
            </p>

            {/* Pager */}
            <div className="flex items-center justify-between sm:justify-end gap-3 order-1 sm:order-2">
              {/* Rows per page */}
              <div className="relative hidden sm:block">
                <select
                  className="appearance-none rounded-md pl-2.5 pr-7 py-1.5 text-xs font-medium focus:outline-none focus:ring-2"
                  style={{
                    border: "1px solid #E2E8F0",
                    color: "#0B1220",
                    backgroundColor: "#FFFFFF",
                  }}
                  value={rowsPerPage}
                  onChange={handleRowsPerPageChange}
                  aria-label="Rows per page"
                >
                  {rowsPerPageOptions.map((num) => (
                    <option key={num} value={num}>
                      {num} / page
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={12}
                  className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2"
                  style={{ color: "#94A3B8" }}
                />
              </div>

              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => goToPage(1)}
                  disabled={page === 1}
                  aria-label="First page"
                  className="hidden sm:flex p-1.5 rounded-md transition-colors disabled:cursor-not-allowed"
                  style={{ color: page === 1 ? "#CBD5E1" : "#47556A" }}
                  onMouseEnter={(e) => page !== 1 && (e.currentTarget.style.backgroundColor = "#F1F5F9")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <ChevronsLeft size={15} />
                </button>

                <button
                  onClick={() => goToPage(page - 1)}
                  disabled={page === 1}
                  aria-label="Previous page"
                  className="p-1.5 rounded-md transition-colors disabled:cursor-not-allowed"
                  style={{ color: page === 1 ? "#CBD5E1" : "#47556A" }}
                  onMouseEnter={(e) => page !== 1 && (e.currentTarget.style.backgroundColor = "#F1F5F9")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <ChevronLeft size={15} />
                </button>

                {/* Numbered pages — hidden on very small screens in favor of X/Y */}
                <div className="hidden sm:flex items-center gap-0.5">
                  {pageRange.map((p, idx) =>
                    typeof p === "number" ? (
                      <button
                        key={idx}
                        onClick={() => goToPage(p)}
                        aria-current={p === page ? "page" : undefined}
                        className="min-w-[28px] h-7 rounded-md text-xs font-semibold transition-colors"
                        style={
                          p === page
                            ? { backgroundColor: "#0FBAFB", color: "#FFFFFF" }
                            : { color: "#47556A" }
                        }
                        onMouseEnter={(e) => {
                          if (p !== page) e.currentTarget.style.backgroundColor = "#F1F5F9";
                        }}
                        onMouseLeave={(e) => {
                          if (p !== page) e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        {p}
                      </button>
                    ) : (
                      <span key={idx} className="px-1 text-xs" style={{ color: "#CBD5E1" }}>
                        …
                      </span>
                    )
                  )}
                </div>

                {/* Compact indicator for mobile */}
                <span
                  className="sm:hidden min-w-[3.5rem] text-center text-xs font-semibold"
                  style={{ color: "#0B1220" }}
                >
                  {page} / {totalPages}
                </span>

                <button
                  onClick={() => goToPage(page + 1)}
                  disabled={page === totalPages}
                  aria-label="Next page"
                  className="p-1.5 rounded-md transition-colors disabled:cursor-not-allowed"
                  style={{ color: page === totalPages ? "#CBD5E1" : "#47556A" }}
                  onMouseEnter={(e) =>
                    page !== totalPages && (e.currentTarget.style.backgroundColor = "#F1F5F9")
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <ChevronRight size={15} />
                </button>

                <button
                  onClick={() => goToPage(totalPages)}
                  disabled={page === totalPages}
                  aria-label="Last page"
                  className="hidden sm:flex p-1.5 rounded-md transition-colors disabled:cursor-not-allowed"
                  style={{ color: page === totalPages ? "#CBD5E1" : "#47556A" }}
                  onMouseEnter={(e) =>
                    page !== totalPages && (e.currentTarget.style.backgroundColor = "#F1F5F9")
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <ChevronsRight size={15} />
                </button>
              </div>

              {/* Jump to page — only worth showing once there's real depth */}
              {totalPages > 8 && (
                <form onSubmit={handleJumpSubmit} className="hidden lg:flex items-center gap-1.5">
                  <span className="text-xs" style={{ color: "#94A3B8" }}>
                    Go to
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={jumpValue}
                    onChange={(e) => setJumpValue(e.target.value)}
                    placeholder={String(page)}
                    className="w-12 rounded-md px-1.5 py-1 text-xs text-center focus:outline-none focus:ring-2"
                    style={{ border: "1px solid #E2E8F0", color: "#0B1220" }}
                  />
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomTable;


// **************************************************OLD TABLE*****************************************************************
// import React, { useState } from "react";
// import { ChevronLeft, ChevronRight, ChevronsUpDown } from "lucide-react";

// const CustomTable = ({
//   columns = [],
//   data = [],
//   rowsPerPageOptions = [5, 10, 15, 20],
//   defaultRowsPerPage = 10,
//   onRowClick = null,
//   footerLegend = [],
//   tableClassName = "",
//   thClassName = "",
//   tdClassName = "",
//   stickyCols = 0,
//   stickyColWidth = 140,
//   hidePagination = false,

//   // Server-side / controlled pagination props
//   currentPage: controlledPage,
//   totalPages: controlledTotalPages,
//   totalRecords,
//   rowsPerPage: controlledRowsPerPage,
//   onPageChange,
//   onRowsPerPageChange,
// }) => {
//   // Internal state — only used when no controlled props are passed
//   const [internalPage, setInternalPage] = useState(1);
//   const [internalRowsPerPage, setInternalRowsPerPage] = useState(defaultRowsPerPage);

//   // Decide: controlled (server-side) vs uncontrolled (client-side)
//   const isControlled = typeof onPageChange === "function";

//   const page = isControlled ? controlledPage : internalPage;
//   const rowsPerPage = isControlled ? controlledRowsPerPage : internalRowsPerPage;
//   const totalPages = isControlled
//     ? controlledTotalPages
//     : Math.max(1, Math.ceil(data.length / rowsPerPage));

//   // In controlled mode, data is already the current page's slice from server
//   // In uncontrolled mode, slice it client-side
//   const paginatedData = isControlled
//     ? data
//     : data.slice((page - 1) * rowsPerPage, page * rowsPerPage);

//   const effectiveRowsPerPage = hidePagination ? data.length : rowsPerPage;
//   const finalPaginatedData = hidePagination ? data : paginatedData;

//   const handlePrev = () => {
//     if (isControlled) onPageChange(page - 1);
//     else setInternalPage((p) => Math.max(p - 1, 1));
//   };

//   const handleNext = () => {
//     if (isControlled) onPageChange(page + 1);
//     else setInternalPage((p) => Math.min(p + 1, totalPages));
//   };

//   const handleRowsPerPageChange = (e) => {
//     const value = Number(e.target.value);
//     if (isControlled) {
//       onRowsPerPageChange?.(value);
//     } else {
//       setInternalRowsPerPage(value);
//       setInternalPage(1);
//     }
//   };

//   const getThClasses = (col, idx) =>
//     typeof thClassName === "function" ? thClassName(col, idx) : thClassName;

//   const getTdClasses = (col, idx) =>
//     typeof tdClassName === "function" ? tdClassName(col, idx) : tdClassName;

//   const MobileCard = ({ row }) => (
//     <div
//       onClick={() => onRowClick?.(row)}
//       className={`bg-white p-4 border-b border-slate-200 ${onRowClick ? "cursor-pointer active:bg-slate-50" : ""
//         }`}
//     >
//       <div className="min-w-0 flex-1">
//         <h3 className="font-semibold text-slate-900 text-base">Record</h3>
//       </div>

//       {row.status && (
//         <div className="my-2">
//           <span
//             className={`text-xs px-2 py-1 my-3 rounded-full whitespace-nowrap ${row.status === "Approved"
//                 ? "bg-green-100 text-green-700"
//                 : row.status === "Rejected"
//                   ? "bg-red-100 text-red-700"
//                   : "bg-yellow-100 text-yellow-700"
//               }`}
//           >
//             {row.status}
//           </span>
//         </div>
//       )}

//       <div className="grid grid-cols-1 gap-y-2">
//         {columns.map((col, idx) => {
//           const value = col.render
//             ? col.render(row[col.accessor], row)
//             : row[col.accessor];

//           if (
//             value === undefined ||
//             value === null ||
//             value === "" ||
//             col.accessor === "name" ||
//             col.accessor === "email" ||
//             col.accessor === "status"
//           ) {
//             return null;
//           }

//           return (
//             <div key={idx} className="min-w-0">
//               <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">
//                 {col.label}
//               </p>
//               <div className="text-sm text-slate-700 break-words">{value}</div>
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );

//   return (
//     <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
//       {/* Desktop Table */}
//       <div className="hidden md:block overflow-x-auto">
//         <table
//           className={`w-full text-sm text-slate-700 ${tableClassName}`}
//           style={{ borderCollapse: "separate", minWidth: "max-content" }}
//         >
//           <thead className="bg-slate-50 border-b border-slate-200">
//             <tr>
//               {columns.map((col, idx) => {
//                 const isSticky = idx < stickyCols;
//                 const leftOffset = isSticky ? idx * stickyColWidth : undefined;
//                 const style = isSticky
//                   ? {
//                     position: "sticky",
//                     left: leftOffset,
//                     zIndex: 50 + idx,
//                     background: "#f8fafc",
//                   }
//                   : undefined;

//                 return (
//                   <th
//                     key={idx}
//                     className={`py-3 px-4 text-left font-semibold text-slate-600 whitespace-nowrap ${getThClasses(
//                       col,
//                       idx
//                     )}`}
//                     style={style}
//                   >
//                     <div className="flex items-center gap-1">
//                       {col.label}
//                       <ChevronsUpDown size={14} className="text-slate-400" />
//                     </div>
//                   </th>
//                 );
//               })}
//             </tr>
//           </thead>

//           <tbody>
//             {finalPaginatedData.map((row, rIdx) => (
//               <tr
//                 key={rIdx}
//                 className={`border-b border-slate-100 hover:bg-slate-50 transition ${onRowClick ? "cursor-pointer" : ""
//                   }`}
//                 onClick={() => onRowClick?.(row)}
//               >
//                 {columns.map((col, cIdx) => {
//                   const isSticky = cIdx < stickyCols;
//                   const leftOffset = isSticky ? cIdx * stickyColWidth : undefined;
//                   const style = isSticky
//                     ? {
//                       position: "sticky",
//                       left: leftOffset,
//                       zIndex: 40 + cIdx,
//                       background: "white",
//                     }
//                     : undefined;

//                   return (
//                     <td
//                       key={cIdx}
//                       className={`py-3 px-4 text-slate-700 whitespace-nowrap ${getTdClasses(
//                         col,
//                         cIdx
//                       )}`}
//                       style={style}
//                     >
//                       {col.render
//                         ? col.render(row[col.accessor], row)
//                         : row[col.accessor]}
//                     </td>
//                   );
//                 })}
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>

//       {/* Mobile Cards */}
//       <div className="md:hidden">
//         {finalPaginatedData.map((row, idx) => (
//           <MobileCard key={idx} row={row} />
//         ))}
//       </div>

//       {/* Footer / Pagination */}
//       {!hidePagination && (
//         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 text-sm text-slate-600 border-t border-slate-200">
//           {footerLegend.length > 0 && (
//             <div className="flex flex-wrap items-center gap-4">
//               {footerLegend.map((item, idx) => (
//                 <div key={idx} className="flex items-center gap-1">
//                   <span className={`w-3 h-3 rounded-full ${item.color}`} />
//                   {item.label}
//                 </div>
//               ))}
//             </div>
//           )}

//           <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
//             <span className="hidden sm:inline">Rows per page</span>

//             <select
//               className="border border-slate-300 rounded-md px-2 py-1 text-slate-700"
//               value={rowsPerPage}
//               onChange={handleRowsPerPageChange}
//             >
//               {rowsPerPageOptions.map((num) => (
//                 <option key={num} value={num}>
//                   {num}
//                 </option>
//               ))}
//             </select>

//             <button
//               onClick={handlePrev}
//               disabled={page === 1}
//               className={`p-1 rounded-md border ${page === 1
//                   ? "opacity-40 cursor-not-allowed"
//                   : "hover:bg-slate-100"
//                 }`}
//             >
//               <ChevronLeft size={16} />
//             </button>

//             <span className="min-w-[4rem] text-center">
//               {String(page).padStart(2, "0")} /{" "}
//               {String(totalPages).padStart(2, "0")}
//             </span>

//             <button
//               onClick={handleNext}
//               disabled={page === totalPages}
//               className={`p-1 rounded-md border ${page === totalPages
//                   ? "opacity-40 cursor-not-allowed"
//                   : "hover:bg-slate-100"
//                 }`}
//             >
//               <ChevronRight size={16} />
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default CustomTable;