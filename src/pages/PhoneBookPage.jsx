import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, SlidersHorizontal, Users, X } from "lucide-react";
import PhoneBookCard from "../components/PhoneBookCard";
import AdminUserFilterModal from "../components/AdminUserFilterModal";
import UserDetailsModal from "../components/UserDetailsModal";
import { getPhoneBook } from "../api/authApi";
import { useAuth } from "../context/AuthContext";

const PER_PAGE = 10;

// ── Skeleton card (mirrors PhoneBookCard's layout so content doesn't
//    jump/reflow once real data swaps in) ───────────────────────────────────
const PhoneBookCardSkeleton = () => (
  <div className="flex gap-4 p-4 bg-white rounded-xl border border-gray-100 flex-col sm:flex-row sm:items-center animate-pulse">
    <div className="w-16 h-16 rounded-full bg-gray-200 self-center sm:self-start shrink-0" />
    <div className="flex-1 space-y-2.5 w-full">
      <div className="h-4 w-2/5 bg-gray-200 rounded" />
      <div className="h-3 w-1/3 bg-gray-200 rounded" />
      <div className="h-3 w-1/2 bg-gray-200 rounded" />
      <div className="h-3 w-1/3 bg-gray-200 rounded" />
      <div className="h-3 w-2/5 bg-gray-200 rounded" />
      <div className="h-3 w-1/2 bg-gray-200 rounded" />
    </div>
  </div>
);

const PhoneBookPage = () => {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [initialLoading, setInitialLoading] = useState(true); // first load / search / filter change
  const [loadingMore, setLoadingMore] = useState(false); // infinite-scroll loads

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    designation: "",
    role: "",
    department: "",
  });
  const { user: loggedInUser } = useAuth();

  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Guards against duplicate fetches firing from rapid scroll events,
  // and against a stale request finishing after a newer search/filter reset.
  const requestId = useRef(0);
  const sentinelRef = useRef(null);

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter(Boolean).length,
    [filters]
  );

  const fetchPage = useCallback(
    async (pageToFetch, { reset }) => {
      const thisRequest = ++requestId.current;
      if (reset) setInitialLoading(true);
      else setLoadingMore(true);

      const res = await getPhoneBook({
        page: pageToFetch,
        limit: PER_PAGE,
        search,
        ...filters,
      });

      // A newer request (e.g. the user typed again) finished first —
      // discard this older response so it can't overwrite fresher data.
      if (thisRequest !== requestId.current) return;

      if (res.success) {
        setUsers((prev) => (reset ? res.users : [...prev, ...res.users]));
        setTotalPages(res.pagination?.totalPages || 1);
        setPage(pageToFetch);
      } else if (reset) {
        setUsers([]);
        setTotalPages(1);
      }

      setInitialLoading(false);
      setLoadingMore(false);
    },
    [search, filters]
  );

  // Search/filter change → start over from page 1, replacing (not
  // appending to) the list.
  useEffect(() => {
    fetchPage(1, { reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filters]);

  // Infinite scroll: observe a sentinel just below the grid and load the
  // next page when it enters the viewport, as long as one isn't already
  // in flight and there's more to fetch.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !initialLoading &&
          !loadingMore &&
          page < totalPages
        ) {
          fetchPage(page + 1, { reset: false });
        }
      },
      { rootMargin: "400px" } // start loading before the user hits bottom
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [page, totalPages, initialLoading, loadingMore, fetchPage]);

  // Build dynamic filter options from currently-loaded data.
  const options = useMemo(() => {
    const roles = [...new Set(users.map((u) => u.role))];
    const departments = [...new Set(users.map((u) => u.department))];
    const designations = [...new Set(users.map((u) => u.designation))];
    return { roles, departments, designations };
  }, [users]);

  const hasMore = page < totalPages;

  return (
    <div className="min-h-screen bg-[#F3F8FB]">
      <div className="max-w-8xl mx-auto p-2 space-y-2">
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">
                Phone Book
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {initialLoading
                  ? "Loading directory…"
                  : `${users.length}${hasMore ? "+" : ""} ${users.length === 1 ? "person" : "people"
                  }`}
              </p>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-72">
                <input
                  type="text"
                  placeholder="Search name, phone, email, address..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 pl-10 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <Search
                  size={18}
                  className="absolute left-3 top-2.5 text-gray-400 pointer-events-none"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <button
                onClick={() => setFilterOpen(true)}
                className="relative inline-flex items-center gap-2 bg-white border border-gray-300 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 shrink-0"
              >
                <SlidersHorizontal size={16} />
                <span className="hidden sm:inline">Filters</span>
                {activeFilterCount > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[11px] font-semibold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Active filter chips — lets people see + clear filters without
              reopening the modal */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(filters)
                .filter(([, v]) => v)
                .map(([key, value]) => (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium pl-3 pr-2 py-1"
                  >
                    {value}
                    <button
                      onClick={() => setFilters((f) => ({ ...f, [key]: "" }))}
                      aria-label={`Remove ${key} filter`}
                      className="rounded-full hover:bg-blue-100 p-0.5"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              <button
                onClick={() =>
                  setFilters({ designation: "", role: "", department: "" })
                }
                className="text-xs font-medium text-gray-500 underline underline-offset-2 hover:text-gray-700"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* ── Initial loading: skeleton grid ────────────────────── */}
        {initialLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <PhoneBookCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* ── Empty state ────────────────────────────────────────── */}
        {!initialLoading && users.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-16 text-gray-500">
            <Users size={36} className="mb-3 text-gray-300" />
            <p className="font-medium text-gray-600">No one matches that search</p>
            <p className="text-sm text-gray-400 mt-1">
              Try a different name, or clear your filters.
            </p>
          </div>
        )}

        {/* ── Cards grid ─────────────────────────────────────────── */}
        {!initialLoading && users.length > 0 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {users.map((user) => (
                <PhoneBookCard
                  key={user._id}
                  user={user}
                  onClick={() => setSelectedUser(user)}
                />
              ))}

              {/* Extra skeletons appended while the next page loads, so the
                  grid keeps its rhythm instead of jumping to a spinner. */}
              {loadingMore &&
                Array.from({ length: 3 }).map((_, i) => (
                  <PhoneBookCardSkeleton key={`more-${i}`} />
                ))}
            </div>

            {/* Sentinel: invisible, sits just below the grid. Intersecting
                it triggers the next page fetch. */}
            <div ref={sentinelRef} className="h-px w-full" />

            {!hasMore && (
              <p className="text-center text-xs text-gray-400 py-4">
                You've reached the end of the directory.
              </p>
            )}
          </>
        )}
      </div>

      {/* Filter Modal */}
      <AdminUserFilterModal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        initialFilters={filters}
        onApply={(f) => setFilters(f)}
        options={options}
      />

      {/* User Detail Modal */}
      <UserDetailsModal
        open={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        user={selectedUser}
      />
    </div>
  );
};

export default PhoneBookPage;