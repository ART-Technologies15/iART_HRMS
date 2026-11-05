import Skeleton, { SkeletonRow } from "./Skeleton";

const Table = ({
  columns = [],
  data = [],
  loading = false,
  emptyText = "No records found",
  onRowClick,
  footer,
}) => {
  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
      {/* =========================
          SCROLLABLE TABLE AREA
      ========================== */}
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[340px] border-collapse text-left text-sm">
          {/* =========================
              TABLE HEADER
          ========================== */}
          <thead className="sticky top-0 z-10 bg-white shadow-sm">
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-primary-bg">
              {columns.map((col) => (
                <th
                  key={col?.key}
                  className={`whitespace-nowrap px-5 py-3 font-semibold text-slate-500 ${col.headerClassName || ""
                    }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>

          {/* =========================
              TABLE BODY
          ========================== */}
          <tbody>
            {loading ? (
              <SkeletonRow columns={columns.length} />
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-5 py-12 text-center text-slate-400"
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={row?._id || row?.id || rowIndex}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`border-b border-slate-200 transition-colors hover:bg-slate-50 ${onRowClick ? "cursor-pointer" : ""
                    }`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-5 py-3.5 align-middle ${col.className || ""
                        }`}
                    >
                      {col.render ? col.render(row) : (row[col.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* =========================
          FIXED FOOTER
      ========================== */}
      {footer && (
        <div className="shrink-0 border-t border-slate-200 bg-white">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Table;
