import { Loader2 } from "lucide-react";

/**
 * Mobile-friendly alternative to <Table />. Renders the exact same
 * `columns` / `data` shape as vertically-stacked cards instead of a
 * horizontally-scrollable table — no side-scrolling needed on a phone.
 *
 * Props:
 *  - columns: same shape as Table's columns — [{ key, header, render?, className? }]
 *  - data: array of row objects
 *  - loading: boolean
 *  - emptyText: string
 *  - onRowClick?: (row) => void
 *  - titleKey?: string — which column's value becomes the card's title row
 *      (defaults to the first column in `columns`). Pass `false` to disable
 *      a title row entirely and list every column in the body instead.
 *  - actionsKey?: string — which column holds row actions (e.g. a dropdown
 *      button); pinned to the top-right of the card instead of listed in
 *      the body. Defaults to "actions" (matches Table's usual convention).
 *      Pass `false` to disable and list it in the body like any other column.
 */
const MobileCardList = ({
  columns,
  data = [],
  loading = false,
  emptyText = "No records found",
  onRowClick,
  titleKey,
  actionsKey = "actions",
}) => {
  const titleColumn =
    titleKey === false
      ? null
      : columns.find((c) => c.key === (titleKey || columns[0]?.key));

  const actionsColumn =
    actionsKey === false ? null : columns.find((c) => c.key === actionsKey);

  const bodyColumns = columns.filter(
    (c) => c.key !== titleColumn?.key && c.key !== actionsColumn?.key,
  );

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={idx}
            className="animate-pulse rounded-xl border border-slate-100 bg-white p-4"
          >
            <div className="flex items-center gap-2 text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
            <div className="mt-3 space-y-2">
              <div className="h-3 w-2/3 rounded bg-slate-100" />
              <div className="h-3 w-1/2 rounded bg-slate-100" />
              <div className="h-3 w-3/4 rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="px-5 py-12 text-center text-slate-400">{emptyText}</div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      {data.map((row, idx) => (
        <div
          key={row._id || idx}
          onClick={onRowClick ? () => onRowClick(row) : undefined}
          className={`rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-colors ${
            onRowClick ? "cursor-pointer active:bg-slate-50" : ""
          }`}
        >
          {(titleColumn || actionsColumn) && (
            <div className="mb-3 flex items-start justify-between gap-3">
              {titleColumn && (
                <div className="min-w-0 flex-1 font-semibold text-slate-800">
                  {titleColumn.render
                    ? titleColumn.render(row)
                    : row[titleColumn.key]}
                </div>
              )}
              {actionsColumn && (
                // stopPropagation so tapping the actions dropdown doesn't
                // also fire onRowClick on the card underneath it
                <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                  {actionsColumn.render
                    ? actionsColumn.render(row)
                    : row[actionsColumn.key]}
                </div>
              )}
            </div>
          )}

          <dl className="space-y-2">
            {bodyColumns.map((col) => (
              <div
                key={col.key}
                className="flex items-start justify-between gap-3 text-sm"
              >
                <dt className="shrink-0 pt-0.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                  {col.header}
                </dt>
                <dd
                  className={`text-right text-slate-700 ${col.className || ""}`}
                >
                  {col.render ? col.render(row) : row[col.key]}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
};

export default MobileCardList;
