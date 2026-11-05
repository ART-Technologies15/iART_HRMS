import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Check, Search } from "lucide-react";

const MENU_GAP = 4;
const VIEWPORT_PADDING = 8;
const ROW_HEIGHT = 36;

const TIMEZONE_ALIASES = {
  "Asia/Calcutta": "Asia/Kolkata",
};

const TIMEZONES = [
  ...new Set(
    Intl.supportedValuesOf("timeZone")
      .map((zone) => TIMEZONE_ALIASES[zone] || zone)
      .concat("Asia/Kolkata"),
  ),
];


const formatTimezone = (zone) => {
  return zone.replaceAll("_", " ");
};

const TimezoneSelect = forwardRef(
  (
    {
      label,
      name,
      value = "",
      onChange,
      error,
      hint,
      className = "",
      placeholder = "Select timezone",
      disabled = false,
      ...rest
    },
    ref,
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [position, setPosition] = useState(null);

    const triggerRef = useRef(null);
    const menuRef = useRef(null);
    const searchInputRef = useRef(null);

    const filteredTimezones = useMemo(() => {
      const query = search.trim().toLowerCase();

      if (!query) return TIMEZONES;

      return TIMEZONES.filter((timezone) =>
        timezone.toLowerCase().includes(query),
      );
    }, [search]);

    const selectedTimezone = value
      ? formatTimezone(value)
      : "";

    const calculatePosition = useCallback(() => {
      const trigger = triggerRef.current;

      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();

      // Search input + approximately 5 rows.
      const estimatedMenuHeight = Math.min(
        filteredTimezones.length * ROW_HEIGHT + 48,
        250,
      );

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
    }, [filteredTimezones.length]);

    useLayoutEffect(() => {
      if (isOpen) {
        calculatePosition();
      }
    }, [isOpen, calculatePosition]);

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
        setSearch("");
      };

      const closeOnScrollOrResize = (event) => {
        if (menuRef.current?.contains(event.target)) return;

        setIsOpen(false);
        setSearch("");
      };

      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("scroll", closeOnScrollOrResize, true);
      window.addEventListener("resize", closeOnScrollOrResize);

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        window.removeEventListener(
          "scroll",
          closeOnScrollOrResize,
          true,
        );
        window.removeEventListener("resize", closeOnScrollOrResize);
      };
    }, [isOpen]);

    useEffect(() => {
      if (isOpen) {
        requestAnimationFrame(() => {
          searchInputRef.current?.focus();
        });
      }
    }, [isOpen]);

    const handleOpen = () => {
      if (disabled) return;

      setIsOpen(true);
      setSearch("");
    };

    const handleSelect = (timezone) => {
      onChange?.({
        target: {
          name,
          value: timezone,
        },
      });

      setIsOpen(false);
      setSearch("");
    };

    return (
      <div className={className}>
        {/* Label */}
        {label && (
          <label htmlFor={name} className="label">
            {label}
          </label>
        )}

        <div className="relative min-w-0 w-full">
          {/* Trigger */}
          <button
            ref={(node) => {
              triggerRef.current = node;

              if (typeof ref === "function") {
                ref(node);
              } else if (ref) {
                ref.current = node;
              }
            }}
            type="button"
            id={name}
            disabled={disabled}
            onClick={() => {
              if (isOpen) {
                setIsOpen(false);
                setSearch("");
              } else {
                handleOpen();
              }
            }}
            className={`input relative flex w-full min-w-0 items-center justify-between gap-2 pr-9 text-left dark:bg-[#131316] dark:border-[#33333a] dark:text-zinc-100
              ${error
                ? "border-error-500 focus:border-error-500"
                : "focus:border-[#183C31] dark:focus:border-sky-400 focus:ring-1 focus:ring-[#183C31]/20 dark:focus:ring-sky-400/20"
              }
              ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}
            `}
            {...rest}
          >
            <span
              className={`min-w-0 flex-1 truncate ${value ? "text-black dark:text-zinc-100" : "text-slate-400 dark:text-zinc-500"
                }`}
              title={value || undefined}
            >
              {selectedTimezone || placeholder}
            </span>

            <svg
              className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-zinc-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""
                }`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {/* Dropdown */}
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
                {/* Search */}
                <div className="border-b border-slate-200 dark:border-[#33333a] p-2 dark:bg-[#131316]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />

                    <input
                      ref={searchInputRef}
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search timezone..."
                      autoComplete="off"
                      className="w-full rounded-md border border-slate-200 dark:border-[#33333a] bg-white dark:bg-[#1e1e23] py-2 pl-9 pr-3 text-sm text-black dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 outline-none focus:border-[#183C31] dark:focus:border-sky-400 focus:ring-1 focus:ring-[#183C31]/20 dark:focus:ring-sky-400/20"
                    />
                  </div>
                </div>

                {/* Options */}
                <div className="max-h-48 overflow-y-auto p-1 custom-scrollbar">
                  {filteredTimezones.length > 0 ? (
                    filteredTimezones.map((timezone) => {
                      const isSelected = value === timezone;

                      return (
                        <button
                          key={timezone}
                          type="button"
                          onClick={() => handleSelect(timezone)}
                          className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${isSelected
                            ? "bg-[#183C31] dark:bg-sky-500 text-white"
                            : "text-black dark:text-zinc-200 hover:bg-[#183C31] dark:hover:bg-[#1e1e23] hover:text-white dark:hover:text-zinc-100"
                            }`}
                        >
                          <span className="min-w-0 flex-1 truncate">
                            {formatTimezone(timezone)}
                          </span>

                          {isSelected && (
                            <Check
                              className="h-4 w-4 shrink-0"
                              strokeWidth={3}
                            />
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-3 py-2 text-sm text-slate-400 dark:text-zinc-500">
                      No timezone found
                    </div>
                  )}
                </div>
              </div>,
              document.body,
            )}
        </div>

        {/* Hint */}
        {hint && !error && (
          <p className="mt-1 text-xs text-slate-500">
            {hint}
          </p>
        )}

        {/* Error */}
        {error && (
          <p className="mt-1 text-xs text-error-600">
            {error}
          </p>
        )}
      </div>
    );
  },
);

TimezoneSelect.displayName = "TimezoneSelect";

export default TimezoneSelect;