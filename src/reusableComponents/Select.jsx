import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Search, X } from "lucide-react";

const MENU_GAP = 4;
const VIEWPORT_PADDING = 8;
const ROW_HEIGHT = 36; // approx height per option row, for the pre-mount estimate
const SEARCH_BOX_HEIGHT = 49; // search input row incl. padding + border

const Select = forwardRef(
  (
    {
      label,
      name,
      options = [],
      placeholder = "Select an option",
      error,
      hint,
      className = "",
      value = "",
      onChange,
      disabled = false,
      loading = false,
      // Opt into multi-select. When true, `value` is expected to be an
      // array of selected values and onChange fires with an array too.
      multiple = false,

      // Show a search box at the top of the dropdown so users can filter
      // options by label. On by default — pass searchOption={false} to hide.
      searchOption = true,
      searchPlaceholder = "Search...",

      // Fields to use from object options
      optionValue = "value",
      optionLabel = "label",

      // Menu variant for styling (e.g., "light" or "dark")
      menuVariant = "light",

      // Show an "X" on the right of the trigger when something is selected,
      // so the user can clear it. Off by default — pass isCrossAble to enable.
      isCrossAble = false,

      ...rest
    },
    ref,
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState(null); // { top, left, width, openUpward }
    const [searchTerm, setSearchTerm] = useState("");
    // Index (inside the visible list) of the option highlighted by the
    // keyboard or the mouse. -1 = nothing highlighted.
    const [activeIndex, setActiveIndex] = useState(-1);

    const triggerRef = useRef(null);
    const menuRef = useRef(null);
    const listRef = useRef(null);
    const searchInputRef = useRef(null);

    // Unique prefix for option ids (used by aria-activedescendant)
    const uid = useId();
    const optionId = (index) => `${uid}-option-${index}`;

    // Normalize options
    const normalizedOptions = options.map((opt) => {
      if (typeof opt === "string") {
        return { value: opt, label: opt };
      }
      return { value: opt[optionValue], label: opt[optionLabel] };
    });

    // Options actually shown in the menu — filtered by the search box
    // (case-insensitive match on the label) when search is enabled.
    const query = searchTerm.trim().toLowerCase();
    const visibleOptions =
      searchOption && query
        ? normalizedOptions.filter((option) =>
          String(option.label ?? "")
            .toLowerCase()
            .includes(query),
        )
        : normalizedOptions;

    // Normalize value to always work with an array internally, regardless
    // of mode — keeps the selection/lookup logic below branch-free.
    const selectedValues = multiple
      ? Array.isArray(value)
        ? value
        : []
      : value
        ? [value]
        : [];

    const selectedOptions = normalizedOptions.filter((option) =>
      selectedValues.includes(option.value),
    );

    const triggerLabel = (() => {
      if (selectedOptions.length === 0) return placeholder;
      if (!multiple) return selectedOptions[0].label;
      if (selectedOptions.length <= 2) {
        return selectedOptions.map((o) => o.label).join(", ");
      }
      return `${selectedOptions.length} selected`;
    })();

    // The clear (X) button only shows when the feature is enabled, the
    // field is usable, and there is something selected to clear.
    const showClear = isCrossAble && !disabled && selectedOptions.length > 0;

    const handleClear = (e) => {
      e.stopPropagation();
      setIsOpen(false);
      // single select -> "" | multi select -> []
      onChange?.({ target: { name, value: multiple ? [] : "" } });
      triggerRef.current?.focus();
    };

    const calculatePosition = useCallback(() => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const estimatedMenuHeight =
        Math.min(
          normalizedOptions.length * ROW_HEIGHT + 8,
          200, // matches max-h-40 * a bit of padding below
        ) + (searchOption ? SEARCH_BOX_HEIGHT : 0);

      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward =
        spaceBelow < estimatedMenuHeight + MENU_GAP &&
        rect.top > estimatedMenuHeight;

      setPosition({
        top: openUpward ? undefined : rect.bottom + MENU_GAP,
        bottom: openUpward
          ? window.innerHeight - rect.top + MENU_GAP
          : undefined,
        left: Math.max(
          VIEWPORT_PADDING,
          Math.min(
            rect.left,
            window.innerWidth - rect.width - VIEWPORT_PADDING,
          ),
        ),
        width: rect.width,
        openUpward,
      });
    }, [normalizedOptions.length, searchOption]);

    // Recompute right before paint so it's positioned correctly on the
    // very first frame it's visible — same pattern as ActionDropdown.
    useLayoutEffect(() => {
      if (isOpen) calculatePosition();
    }, [isOpen, calculatePosition]);

    // Clear the search box whenever the menu closes, so it always opens
    // showing the full list.
    useEffect(() => {
      if (!isOpen) setSearchTerm("");
    }, [isOpen]);

    // Decide which option is highlighted:
    //  - when the menu opens  -> the selected option (or the first one)
    //  - when the search text changes -> the first match
    useEffect(() => {
      if (!isOpen) {
        setActiveIndex(-1);
        return;
      }
      if (query) {
        setActiveIndex(visibleOptions.length ? 0 : -1);
        return;
      }
      const selectedIndex = visibleOptions.findIndex((o) =>
        selectedValues.includes(o.value),
      );
      setActiveIndex(
        selectedIndex >= 0 ? selectedIndex : visibleOptions.length ? 0 : -1,
      );
      // Only re-run when the menu opens or the search text changes — not on
      // every render, otherwise arrow-key movement would be reset.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, query]);

    // Keep the highlighted option visible while moving with the arrow keys.
    // Scrolls only the list itself (not the page), so it can't trigger the
    // "close on scroll" handler below.
    const isPositioned = Boolean(position);
    useEffect(() => {
      if (!isOpen || !isPositioned || activeIndex < 0) return;
      const list = listRef.current;
      const el = list?.querySelector(`[data-index="${activeIndex}"]`);
      if (!list || !el) return;

      const top = el.offsetTop;
      const bottom = top + el.offsetHeight;
      if (top < list.scrollTop) {
        list.scrollTop = top - 4;
      } else if (bottom > list.scrollTop + list.clientHeight) {
        list.scrollTop = bottom - list.clientHeight + 4;
      }
    }, [activeIndex, isOpen, isPositioned]);

    // Focus the search box as soon as the menu is on screen. Skipped on
    // touch devices, where auto-focusing would pop the on-screen keyboard
    // before the user has even looked at the options.
    useEffect(() => {
      if (!isOpen || !isPositioned || !searchOption) return;
      if (window.matchMedia?.("(pointer: coarse)").matches) return;
      searchInputRef.current?.focus();
    }, [isOpen, isPositioned, searchOption]);

    // Close on outside click, and on scroll/resize (rather than trying
    // to keep a portaled, fixed-position menu glued to a trigger that
    // might live inside a scrolling modal — simplest and most robust).
    useEffect(() => {
      if (!isOpen) return;

      const handleClickOutside = (event) => {
        if (
          triggerRef.current?.contains(event.target) ||
          menuRef.current?.contains(event.target)
        ) {
          return;
        }
        setIsOpen(false);
      };

      const closeOnScrollOrResize = (event) => {
        // Scrolling the option list itself fires a scroll event too
        // (it bubbles/captures up to window) — ignore that one, only
        // close for scrolling *outside* the menu (e.g. the page or a
        // modal's content area scrolling underneath it).
        // (`resize` events target `window`, which isn't a Node, so guard
        // before calling .contains() or it throws.)
        if (
          event.target instanceof Node &&
          menuRef.current?.contains(event.target)
        ) {
          return;
        }

        // Mobile keyboards resize/scroll the viewport when the search box
        // is focused — that shouldn't dismiss the menu, just re-anchor it.
        if (
          searchInputRef.current &&
          document.activeElement === searchInputRef.current
        ) {
          calculatePosition();
          return;
        }

        setIsOpen(false);
      };

      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("scroll", closeOnScrollOrResize, true);
      window.addEventListener("resize", closeOnScrollOrResize);

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        window.removeEventListener("scroll", closeOnScrollOrResize, true);
        window.removeEventListener("resize", closeOnScrollOrResize);
      };
    }, [isOpen, calculatePosition]);

    const handleSelect = (option) => {
      if (!multiple) {
        setIsOpen(false);
        onChange?.({ target: { name, value: option.value } });
        return;
      }

      // Multi-select: toggle the clicked option in/out of the array and
      // keep the menu open so more than one pick can be made in a row.
      const alreadySelected = selectedValues.includes(option.value);
      const nextValue = alreadySelected
        ? selectedValues.filter((v) => v !== option.value)
        : [...selectedValues, option.value];

      onChange?.({ target: { name, value: nextValue } });
    };

    // Moves the highlight up/down and wraps around at both ends
    const moveActive = (delta) => {
      const count = visibleOptions.length;
      if (count === 0) return;
      setActiveIndex((prev) => {
        if (prev < 0) return delta > 0 ? 0 : count - 1;
        return (prev + delta + count) % count;
      });
    };

    // Keyboard handling shared by the trigger button and the search box:
    //   ArrowDown / ArrowUp  open the menu, then move the highlight
    //   Enter                select the highlighted option
    //   Escape               close the menu
    //   Tab                  close the menu and let focus move on
    //   Home / End           first / last option (on the trigger)
    //   Space                select the highlighted option (on the trigger)
    const handleKeyDown = (e, fromSearch = false) => {
      switch (e.key) {
        case "ArrowDown":
        case "ArrowUp": {
          e.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else {
            moveActive(e.key === "ArrowDown" ? 1 : -1);
          }
          break;
        }

        case "Home":
        case "End": {
          if (fromSearch || !isOpen) break; // keep normal cursor movement
          e.preventDefault();
          setActiveIndex(
            visibleOptions.length
              ? e.key === "Home"
                ? 0
                : visibleOptions.length - 1
              : -1,
          );
          break;
        }

        case "Enter": {
          if (!isOpen) break; // closed: let the button's normal click open it
          e.preventDefault();
          const option = visibleOptions[activeIndex];
          if (option) handleSelect(option);
          break;
        }

        case " ": {
          // In the search box a space is just a character
          if (fromSearch || !isOpen) break;
          e.preventDefault();
          const option = visibleOptions[activeIndex];
          if (option) handleSelect(option);
          break;
        }

        case "Escape": {
          if (!isOpen) break;
          // Close just the dropdown — stop the event here so a parent modal's
          // own Escape handler doesn't also close the whole form.
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(false);
          triggerRef.current?.focus();
          break;
        }

        case "Tab": {
          if (isOpen) setIsOpen(false);
          break;
        }

        default:
          break;
      }
    };

    const activeDescendant =
      isOpen && activeIndex >= 0 && visibleOptions[activeIndex]
        ? optionId(activeIndex)
        : undefined;

    return (
      <div className={className}>
        {label && (
          <label htmlFor={name} className="label">
            {label}
          </label>
        )}

        <div className="relative min-w-0 w-full">
          {/* Trigger */}
          <button
            ref={triggerRef}
            type="button"
            id={name}
            disabled={disabled || loading}
            onClick={() => setIsOpen((prev) => !prev)}
            className={`input relative flex w-full min-w-0 items-center justify-between gap-2 pr-9 text-left dark:bg-[#131316] dark:border-[#33333a] dark:text-zinc-100 ${error
                ? "border-error-500 focus:border-error-500"
                : "focus:border-[#183C31] dark:focus:border-sky-400 focus:ring-1 focus:ring-[#183C31]/20 dark:focus:ring-sky-400/20"
              } ${loading ? "cursor-not-allowed opacity-70" : ""}`}
            {...rest}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-activedescendant={activeDescendant}
            onKeyDown={(e) => {
              rest.onKeyDown?.(e);
              if (!e.defaultPrevented) handleKeyDown(e, false);
            }}
          >
            <span className={`min-w-0 flex-1 truncate ${selectedOptions.length === 0 ? "text-slate-400 dark:text-zinc-500" : "text-slate-900 dark:text-zinc-100"}`}>
              {loading ? "Loading..." : triggerLabel}
            </span>

            {loading ? (
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                <span className="block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-[#183C31]" />
              </span>
            ) : (
              !showClear && (
                <ChevronDown
                  className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-zinc-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""
                    }`}
                />
              )
            )}
          </button>

          {/* Clear (X) button — a sibling of the trigger, not a child, because
              a <button> inside a <button> is invalid HTML. Only rendered when
              isCrossAble is passed and something is selected. */}
          {showClear && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear selection"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 dark:text-zinc-400 transition-colors hover:bg-slate-100 dark:hover:bg-[#1e1e23] hover:text-slate-700 dark:hover:text-zinc-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Dropdown — portaled to <body>, so it's never clipped by a
              modal's overflow-y-auto content area or any other
              overflow-hidden/scroll ancestor. */}
          {isOpen &&
            position &&
            createPortal(
              <div
                ref={menuRef}
                style={{
                  position: "fixed",
                  top: position.top,
                  bottom: position.bottom,
                  left: position.left,
                  width: position.width,
                }}
                className="z-[10000] overflow-hidden rounded-md border border-slate-200 dark:border-[#33333a] bg-white dark:bg-[#131316] shadow-lg dark:shadow-[0_10px_25px_rgba(0,0,0,0.6)]"
              >
                {/* Search box */}
                {searchOption && (
                  <div className="border-b border-slate-100 dark:border-[#33333a] p-2 dark:bg-[#131316]">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, true)}
                        placeholder={searchPlaceholder}
                        aria-label="Search options"
                        aria-activedescendant={activeDescendant}
                        autoComplete="off"
                        className="w-full rounded border border-slate-200 dark:border-[#33333a] bg-white dark:bg-[#1e1e23] py-1.5 pl-8 pr-2 text-sm text-black dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:border-[#183C31] dark:focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-[#183C31]/20 dark:focus:ring-sky-400/20"
                      />
                    </div>
                  </div>
                )}

                <div
                  ref={listRef}
                  role="listbox"
                  aria-multiselectable={multiple || undefined}
                  className="relative max-h-40 overflow-y-auto p-1 custom-scrollbar"
                >
                  {visibleOptions.length > 0 ? (
                    visibleOptions.map((option, index) => {
                      const isSelected = selectedValues.includes(option.value);
                      const isActive = index === activeIndex;

                      return (
                        <button
                          key={option.value}
                          id={optionId(index)}
                          data-index={index}
                          role="option"
                          aria-selected={isSelected}
                          type="button"
                          tabIndex={-1}
                          // Keep focus in the search box while picking, so
                          // multi-select users can click several matches
                          // in a row without re-clicking the input.
                          onMouseDown={
                            searchOption ? (e) => e.preventDefault() : undefined
                          }
                          // onMouseMove (not onMouseEnter) so that scrolling
                          // the list with the arrow keys under a still mouse
                          // doesn't steal the highlight.
                          onMouseMove={() => {
                            if (activeIndex !== index) setActiveIndex(index);
                          }}
                          onClick={() => handleSelect(option)}
                          className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${isActive
                              ? "bg-[#183C31] dark:bg-sky-500 text-white"
                              : isSelected && !multiple
                                ? "bg-[#183C31]/10 dark:bg-sky-400/15 font-medium text-[#183C31] dark:text-sky-300"
                                : "text-black dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#1e1e23]"
                            }`}
                        >
                          {multiple && (
                            <span
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${isSelected
                                  ? "border-[#183C31] dark:border-sky-400 bg-[#183C31] dark:bg-sky-500 text-white"
                                  : "border-slate-300 dark:border-[#33333a] bg-white dark:bg-[#232328] text-transparent"
                                } ${isActive && isSelected ? "border-white" : ""}`}
                            >
                              <Check className="h-3 w-3" strokeWidth={3} />
                            </span>
                          )}
                          <span
                            className="min-w-0 flex-1 truncate"
                            title={option?.label}
                          >
                            {option?.label}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-3 py-2 text-sm text-slate-400 dark:text-zinc-500">
                      {normalizedOptions.length > 0
                        ? "No matching options"
                        : "No options available"}
                    </div>
                  )}
                </div>
              </div>,
              document.body,
            )}
        </div>

        {hint && !error && (
          <p className="mt-1 text-xs text-slate-500">{hint}</p>
        )}
        {error && <p className="mt-1 text-xs text-error-600">{error}</p>}
      </div>
    );
  },
);

Select.displayName = "Select";

export default Select;
