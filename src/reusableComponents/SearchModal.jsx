import React, {
    useEffect,
    useMemo,
    useRef,
    useState,
    useCallback,
} from "react";

import {
    Search,
    X,
    CornerDownLeft,
    Loader2,
} from "lucide-react";

const SearchModal = ({
    isOpen,
    onClose,
    data = [],
    isLoading = false,
    onSearchChange,
    placeholder = "Search...",
    sectionTitle = "SEARCH RESULTS",
    onSelect,
}) => {
    const [search, setSearch] = useState("");
    const [activeIndex, setActiveIndex] = useState(-1);

    const inputRef = useRef(null);
    const listRef = useRef(null);
    const itemRefs = useRef([]);

    // Reset + focus when modal opens
    useEffect(() => {
        if (!isOpen) return;

        setSearch("");
        setActiveIndex(-1);

        const timer = setTimeout(() => {
            inputRef.current?.focus();
        }, 40);

        document.body.style.overflow = "hidden";

        return () => {
            clearTimeout(timer);
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    /*
     * Search is handled by the backend.
     * Do not filter the API response again on the frontend.
     */
    const filteredData = useMemo(() => {
        return Array.isArray(data) ? data : [];
    }, [data]);

    // Highlight matching text
    const highlightMatch = (text, query) => {
        if (!query?.trim() || !text) return text;

        const escaped = query
            .trim()
            .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        const parts = String(text).split(
            new RegExp(`(${escaped})`, "gi")
        );

        return parts.map((part, i) =>
            i % 2 === 1 ? (
                <mark
                    key={i}
                    className="bg-[#D4EDE6] text-[#183C31] dark:bg-sky-400/20 dark:text-sky-300 rounded-[2px] px-[1px]"
                >
                    {part}
                </mark>
            ) : (
                part
            )
        );
    };

    // Keyboard navigation
    const handleKeyDown = useCallback(
        (e) => {
            if (!isOpen) return;

            if (e.key === "Escape") {
                e.preventDefault();
                onClose?.();
                return;
            }

            /*
             * Don't navigate results while API request is running.
             */
            if (isLoading) return;

            if (e.key === "ArrowDown") {
                e.preventDefault();

                setActiveIndex((prev) =>
                    prev < filteredData.length - 1 ? prev + 1 : 0
                );
            }

            if (e.key === "ArrowUp") {
                e.preventDefault();

                setActiveIndex((prev) =>
                    prev > 0 ? prev - 1 : filteredData.length - 1
                );
            }

            if (
                e.key === "Enter" &&
                activeIndex >= 0 &&
                filteredData[activeIndex]
            ) {
                e.preventDefault();

                onSelect?.(filteredData[activeIndex]);
                onClose?.();
            }
        },
        [
            isOpen,
            isLoading,
            filteredData,
            activeIndex,
            onClose,
            onSelect,
        ]
    );

    useEffect(() => {
        document.addEventListener("keydown", handleKeyDown);

        return () =>
            document.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);

    // Scroll active item into view
    useEffect(() => {
        if (
            activeIndex >= 0 &&
            itemRefs.current[activeIndex]
        ) {
            itemRefs.current[activeIndex].scrollIntoView({
                block: "nearest",
                behavior: "smooth",
            });
        }
    }, [activeIndex]);

    // Reset active index when API results change
    useEffect(() => {
        setActiveIndex(filteredData.length > 0 ? 0 : -1);
    }, [filteredData]);

    if (!isOpen) return null;

    const hasResults = filteredData.length > 0;

    const showEmptyState =
        search.trim() &&
        !hasResults &&
        !isLoading;

    const showInitialEmptyState =
        !search.trim() &&
        data.length === 0 &&
        !isLoading;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[10vh] sm:pt-[12vh]">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-[#0F1C1A]/55 dark:bg-black/70 backdrop-blur-[6px] transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className="
                    relative z-10 w-full max-w-[640px]
                    overflow-hidden rounded-2xl
                    bg-white dark:bg-[#131316]
                    shadow-[0_25px_50px_-12px_rgba(15,28,26,0.25)]
                    border border-slate-200/80 dark:border-[#33333a]
                    animate-[modal-enter_0.22s_ease-out]
                "
                role="dialog"
                aria-modal="true"
                aria-label="Search"
            >
                {/* Search Header */}
                <div className="flex items-center gap-3 border-b border-slate-100 dark:border-[#212125] px-4 py-3.5 dark:bg-[#131316]">
                    <Search
                        className="h-5 w-5 shrink-0 text-[#8EA2BF] dark:text-zinc-500"
                        strokeWidth={1.8}
                    />

                    <input
                        ref={inputRef}
                        type="text"
                        value={search}
                        onChange={(e) => {
                            const value = e.target.value;

                            setSearch(value);
                            setActiveIndex(-1);
                            onSearchChange?.(value);
                        }}
                        placeholder={placeholder}
                        className="
                            h-11 min-w-0 flex-1
                            bg-transparent
                            text-[15px] text-slate-800 dark:text-zinc-100
                            outline-none
                            placeholder:text-slate-400 dark:placeholder:text-zinc-500
                        "
                    />

                    {/* Loading indicator */}
                    {isLoading && (
                        <Loader2
                            className="h-4 w-4 shrink-0 animate-spin text-[#183C31] dark:text-sky-400"
                            aria-label="Searching"
                        />
                    )}

                    {/* Clear button */}
                    {!isLoading && search && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearch("");
                                setActiveIndex(-1);
                                onSearchChange?.("");

                                inputRef.current?.focus();
                            }}
                            className="
                                flex h-7 w-7 items-center justify-center
                                rounded-full text-slate-400 dark:text-zinc-400
                                hover:bg-slate-100 dark:hover:bg-[#2c2c32] dark:hover:bg-[#1e1e23]
                                hover:text-slate-600 dark:hover:text-zinc-200
                                transition-colors
                            "
                            aria-label="Clear search"
                        >
                            <X
                                className="h-4 w-4"
                                strokeWidth={2}
                            />
                        </button>
                    )}

                    {/* Esc badge */}
                    <button
                        type="button"
                        onClick={onClose}
                        className="
                            hidden sm:flex items-center
                            rounded-md border border-slate-200 dark:border-[#33333a]
                            bg-slate-50 dark:bg-[#232328] px-2 py-1
                            text-[11px] font-medium text-slate-500 dark:text-zinc-400
                            hover:bg-slate-100 dark:hover:bg-[#2c2c32]
                            hover:text-slate-700 dark:hover:text-zinc-200
                            transition-colors
                        "
                    >
                        Esc
                    </button>
                </div>

                {/* Results area */}
                <div
                    ref={listRef}
                    className="max-h-[min(360px,50vh)] overflow-y-auto overscroll-contain"
                >
                    {/* Loading state */}
                    {isLoading && (
                        <div className="px-4 py-4">
                            {/* Loading skeletons */}
                            <div className="space-y-2">
                                {[1, 2, 3].map((item) => (
                                    <div
                                        key={item}
                                        className="rounded-xl px-3.5 py-3"
                                    >
                                        <div className="animate-pulse">
                                            <div className="h-4 w-2/3 rounded bg-slate-200 dark:bg-zinc-700" />
                                            <div className="mt-2 h-3 w-1/3 rounded bg-slate-100 dark:bg-zinc-800" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Section header + count */}
                    {!isLoading && hasResults && (
                        <div className="sticky top-0 z-[1] flex items-center justify-between bg-white/95 dark:bg-[#131316]/95 backdrop-blur-sm px-4 pt-3 pb-1.5">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8EA2BF] dark:text-zinc-500">
                                {sectionTitle}
                            </p>

                            <span className="text-[11px] font-medium text-slate-400">
                                {filteredData.length}{" "}
                                {filteredData.length === 1
                                    ? "result"
                                    : "results"}
                            </span>
                        </div>
                    )}

                    {/* Result Items */}
                    {!isLoading && hasResults && (
                        <div className="px-2 pb-2 pt-1">
                            {filteredData.map((item, index) => {
                                const isActive =
                                    index === activeIndex;

                                return (
                                    <button
                                        key={
                                            item._id ||
                                            item.id ||
                                            `${item.type}-${index}`
                                        }
                                        ref={(el) =>
                                        (itemRefs.current[index] =
                                            el)
                                        }
                                        type="button"
                                        onClick={() => {
                                            onSelect?.(item);
                                            onClose?.();
                                        }}
                                        onMouseEnter={() =>
                                            setActiveIndex(index)
                                        }
                                        className={`
                                            group relative w-full rounded-xl px-3.5 py-3
                                            text-left transition-all duration-150
                                            ${isActive
                                                ? "bg-[#183C31] dark:bg-sky-500/20 text-white shadow-sm"
                                                : "hover:bg-slate-50 dark:hover:bg-[#1e1e23] text-slate-800 dark:text-zinc-200"
                                            }
                                        `}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <div
                                                    className={`
                                                        text-[15px] font-semibold leading-snug truncate
                                                        ${isActive
                                                            ? "text-white dark:text-sky-300"
                                                            : "text-[#1E293B] dark:text-zinc-100"
                                                        }
                                                    `}
                                                >
                                                    {highlightMatch(
                                                        item.name,
                                                        search
                                                    )}
                                                </div>

                                                <div
                                                    className={`
                                                        mt-0.5 text-[13px] leading-tight truncate capitalize
                                                        ${isActive
                                                            ? "text-[#B8D4C8] dark:text-sky-300/80"
                                                            : "text-[#8293AE] dark:text-zinc-400"
                                                        }
                                                    `}
                                                >
                                                    {[
                                                        item.type,
                                                        item.country,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(" · ")}
                                                </div>
                                            </div>

                                            {/* Enter hint */}
                                            {isActive && (
                                                <div className="mt-0.5 flex shrink-0 items-center gap-1 text-[11px] text-[#A8C9B8] dark:text-sky-300">
                                                    <CornerDownLeft
                                                        className="h-3.5 w-3.5"
                                                        strokeWidth={2}
                                                    />

                                                    <span className="hidden sm:inline">
                                                        Enter
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* No results */}
                    {showEmptyState && (
                        <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-[#232328]">
                                <Search
                                    className="h-5 w-5 text-slate-400"
                                    strokeWidth={1.8}
                                />
                            </div>

                            <p className="text-[15px] font-medium text-slate-700 dark:text-zinc-300">
                                No results for “{search}”
                            </p>

                            <p className="mt-1.5 text-[13px] text-slate-500 dark:text-zinc-400 max-w-[260px]">
                                Try a different name of Client, Investor or Project
                            </p>
                        </div>
                    )}

                    {/* Initial empty state */}
                    {showInitialEmptyState && (
                        <div className="px-6 py-10 text-center">
                            <p className="text-sm text-slate-500 dark:text-zinc-400">
                                Start typing to search…
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer hint */}
                {!isLoading && hasResults && (
                    <div className="hidden sm:flex items-center justify-between border-t border-slate-100 dark:border-[#212125] dark:bg-[#18181c] px-4 py-2.5 text-[11px] text-slate-400 dark:text-zinc-400">
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                                <kbd className="rounded border border-slate-200 dark:border-[#33333a] bg-slate-50 dark:bg-[#232328] px-1.5 py-0.5 font-medium text-slate-500 dark:text-zinc-400">
                                    ↑
                                </kbd>

                                <kbd className="rounded border border-slate-200 dark:border-[#33333a] bg-slate-50 dark:bg-[#232328] px-1.5 py-0.5 font-medium text-slate-500 dark:text-zinc-400">
                                    ↓
                                </kbd>

                                <span className="ml-0.5">
                                    to navigate
                                </span>
                            </span>

                            <span className="flex items-center gap-1">
                                <kbd className="rounded border border-slate-200 dark:border-[#33333a] bg-slate-50 dark:bg-[#232328] px-1.5 py-0.5 font-medium text-slate-500 dark:text-zinc-400">
                                    ↵
                                </kbd>

                                <span>to select</span>
                            </span>
                        </div>

                        <span className="flex items-center gap-1">
                            <kbd className="rounded border border-slate-200 dark:border-[#33333a] bg-slate-50 dark:bg-[#232328] px-1.5 py-0.5 font-medium text-slate-500 dark:text-zinc-400">
                                esc
                            </kbd>

                            <span>to close</span>
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchModal;
