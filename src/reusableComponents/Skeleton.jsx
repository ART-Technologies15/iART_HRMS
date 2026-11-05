/**
 * Reusable skeleton primitives with a shimmer animation.
 * Usage:
 *   <Skeleton className="h-4 w-32" />
 *   <SkeletonText lines={3} />
 *   <SkeletonCard />
 */

const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse rounded-lg bg-slate-200/80 ${className}`} />
);

const SkeletonText = ({ lines = 3, className = "" }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        className={`h-3.5 ${i === lines - 1 ? "w-2/3" : "w-full"}`}
      />
    ))}
  </div>
);

const SkeletonCard = ({ className = "" }) => (
  <div className={`card p-5 ${className}`}>
    <div className="flex items-start justify-between">
      <div className="flex-1 space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-12 w-12 rounded-xl" />
    </div>
  </div>
);

const SkeletonRow = ({ columns = 5 }) => (
  <>
    {Array.from({ length: 6 }).map((_, rowIdx) => (
      <tr key={rowIdx} className="border-b border-slate-100">
        {Array.from({ length: columns }).map((_, colIdx) => (
          <td key={colIdx} className="px-5 py-3.5">
            <Skeleton
              className={`h-4 ${colIdx === 0 ? "w-32" : colIdx === columns - 1 ? "w-16" : "w-20"}`}
            />
          </td>
        ))}
      </tr>
    ))}
  </>
);

export { SkeletonText, SkeletonCard, SkeletonRow };
export default Skeleton;
