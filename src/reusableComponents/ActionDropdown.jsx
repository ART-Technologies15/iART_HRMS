import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "lucide-react";

const DEFAULT_MENU_WIDTH = 192;
const MENU_GAP = 8;
const VIEWPORT_PADDING = 8;
const ROW_HEIGHT = 44;
const DIVIDER_HEIGHT = 9;

// -----------------------------------------
// Detects "real" hover devices (mouse/trackpad).
// Touch, and most tablets, report hover:none or
// pointer:coarse, so they fall back to click.
// -----------------------------------------
const getCanHover = () => {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
};

const ActionDropdown = ({
  actions = [],

  // =========================
  // Trigger customization
  // =========================
  trigger,
  triggerIcon: TriggerIcon = MoreVertical,
  triggerImage,
  triggerLabel,
  triggerClassName = "",

  // =========================
  // Dropdown size
  // =========================
  dropdownWidth = DEFAULT_MENU_WIDTH,
  dropdownHeight = "auto",

  // =========================
  // Open behavior
  // =========================
  // "auto" (default): hover on mouse/trackpad devices, click on
  // touch/tablet/mobile. Pass "hover" or "click" to force one mode.
  openOn = "auto",
}) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const [canHover, setCanHover] = useState(getCanHover);

  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const timeoutRef = useRef(null);

  // -----------------------------------------
  // Re-check hover capability if it changes
  // (e.g. a 2-in-1 laptop switching to tablet
  // mode, or a mouse being connected/disconnected)
  // -----------------------------------------
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mql = window.matchMedia("(hover: hover) and (pointer: fine)");
    const handleChange = () => setCanHover(mql.matches);

    // Safari < 14 only supports addListener/removeListener
    if (mql.addEventListener) {
      mql.addEventListener("change", handleChange);
      return () => mql.removeEventListener("change", handleChange);
    }
    mql.addListener(handleChange);
    return () => mql.removeListener(handleChange);
  }, []);

  const shouldHover =
    openOn === "hover" ? true : openOn === "click" ? false : canHover;

  // -----------------------------------------
  // Convert width/height to numeric px when
  // calculating viewport position
  // -----------------------------------------
  const getNumericSize = (value, fallback) => {
    if (typeof value === "number") {
      return value;
    }

    if (typeof value === "string") {
      const parsed = parseFloat(value);

      if (!Number.isNaN(parsed)) {
        // Works correctly for px values.
        // For rem/% values, we'll use fallback for positioning.
        if (value.endsWith("px")) {
          return parsed;
        }
      }
    }

    return fallback;
  };

  const menuWidthPx = getNumericSize(dropdownWidth, DEFAULT_MENU_WIDTH);

  const estimatedMenuHeight =
    dropdownHeight === "auto"
      ? actions.filter((a) => !a.divider).length * ROW_HEIGHT +
      actions.filter((a) => a.divider).length * DIVIDER_HEIGHT +
      8
      : getNumericSize(dropdownHeight, 200);

  // -----------------------------------------
  // Mouse enter — only wired up on hover-capable
  // devices (see JSX below)
  // -----------------------------------------
  const handleMouseEnter = () => {
    if (!shouldHover) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setOpen(true);
  };

  // -----------------------------------------
  // Mouse leave
  // -----------------------------------------
  const handleMouseLeave = () => {
    if (!shouldHover) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setOpen(false);
    }, 150);
  };

  // -----------------------------------------
  // Calculate dropdown position
  // -----------------------------------------
  const calculatePosition = useCallback(() => {
    const btn = triggerRef.current;

    if (!btn) return;

    const rect = btn.getBoundingClientRect();

    const spaceBelow = window.innerHeight - rect.bottom;

    const openUpward =
      spaceBelow < estimatedMenuHeight + MENU_GAP &&
      rect.top > estimatedMenuHeight;

    // Align right edge with trigger
    let left = rect.right - menuWidthPx;

    // Prevent going outside left
    left = Math.max(VIEWPORT_PADDING, left);

    // Prevent going outside right
    left = Math.min(left, window.innerWidth - menuWidthPx - VIEWPORT_PADDING);

    setPosition({
      top: rect.bottom + MENU_GAP,
      bottom: window.innerHeight - rect.top + MENU_GAP,
      left,
      openUpward,
    });
  }, [menuWidthPx, estimatedMenuHeight]);

  // -----------------------------------------
  // Calculate position before paint
  // -----------------------------------------
  useLayoutEffect(() => {
    if (open) {
      calculatePosition();
    }
  }, [open, calculatePosition]);

  // -----------------------------------------
  // Outside click/tap + scroll + resize
  // -----------------------------------------
  useEffect(() => {
    if (!open) return;

    const handleOutside = (e) => {
      if (
        triggerRef.current?.contains(e.target) ||
        menuRef.current?.contains(e.target)
      ) {
        return;
      }

      setOpen(false);
    };

    const closeOnScrollOrResize = () => {
      setOpen(false);
    };

    // mousedown covers desktop; touchstart is added explicitly since
    // some mobile browsers don't reliably fire mousedown for taps
    // outside the element (esp. when the tap lands on another
    // interactive element).
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside, {
      passive: true,
    });

    window.addEventListener("scroll", closeOnScrollOrResize, true);
    window.addEventListener("resize", closeOnScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);

      window.removeEventListener("scroll", closeOnScrollOrResize, true);
      window.removeEventListener("resize", closeOnScrollOrResize);
    };
  }, [open]);

  // -----------------------------------------
  // Cleanup timeout
  // -----------------------------------------
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // -----------------------------------------
  // Trigger click — always works, on every
  // device. This is the *only* way to open/close
  // on touch/tablet since hover never fires there.
  // -----------------------------------------
  const handleTriggerClick = (e) => {
    e.stopPropagation();

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setOpen((prev) => !prev);
  };

  // -----------------------------------------
  // Check custom trigger content
  // -----------------------------------------
  const hasCustomTriggerContent = Boolean(
    trigger || triggerImage || triggerLabel || TriggerIcon !== MoreVertical,
  );

  // -----------------------------------------
  // Trigger classes
  // -----------------------------------------
  const defaultTriggerClass = hasCustomTriggerContent
    ? "flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-[#1e1e23]"
    : "rounded-lg p-2 text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#1e1e23]";

  // -----------------------------------------
  // Dropdown style
  // -----------------------------------------
  const dropdownStyle = {
    position: "fixed",

    top: position?.openUpward ? undefined  : position?.top,

    bottom: position?.openUpward ? position?.bottom  : undefined,

    left: position?.left + 10,

    width:
      typeof dropdownWidth === "number" ? `${dropdownWidth}px` : dropdownWidth,

    height:
      dropdownHeight === "auto"
        ? "auto"
        : typeof dropdownHeight === "number"
          ? `${dropdownHeight}px`
          : dropdownHeight,
  };

  return (
    <div
      className="relative inline-block"
      // Only wire up hover handlers when we're actually treating this
      // as a hover-open menu. On touch/tablet these are simply never
      // attached, so nothing weird happens with "sticky hover" states.
      onMouseEnter={shouldHover ? handleMouseEnter : undefined}
      onMouseLeave={shouldHover ? handleMouseLeave : undefined}
    >
      {/* =========================
          Trigger
      ========================== */}
      <button
        type="button"
        ref={triggerRef}
        onClick={handleTriggerClick}
        className={triggerClassName || defaultTriggerClass}
      >
        {trigger ? (
          trigger
        ) : (
          <>
            {triggerImage ? (
              <img
                src={triggerImage}
                alt=""
                className="h-6 w-6 rounded-full object-cover"
              />
            ) : (
              <TriggerIcon className="h-5 w-5" />
            )}

            {triggerLabel && <span>{triggerLabel}</span>}
          </>
        )}
      </button>

      {/* =========================
          Dropdown
      ========================== */}
      {open &&
        position &&
        createPortal(
          <div
            ref={menuRef}
            onMouseEnter={shouldHover ? handleMouseEnter : undefined}
            onMouseLeave={shouldHover ? handleMouseLeave : undefined}
            style={dropdownStyle}
            className={`z-50 overflow-hidden rounded-lg border border-slate-200 dark:border-[#33333a] bg-white dark:bg-[#131316] shadow-xl dark:shadow-[0_10px_25px_rgba(0,0,0,0.6)] ${position.openUpward
                ? "action-dropdown-menu-up"
                : "action-dropdown-menu"
              }`}
          >
            {actions.map((item, index) => {
              // Divider
              if (item.divider) {
                return (
                  <div
                    key={`divider-${index}`}
                    className="my-1 border-t border-slate-200 dark:border-[#33333a]"
                  />
                );
              }

              // Action
              return (
                <button
                  type="button"
                  key={`${item.label}-${index}`}
                  onClick={(e) => {
                    e.stopPropagation();

                    setOpen(false);

                    item.onClick?.();
                  }}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-sm transition-colors ${item.className || "text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#1e1e23] cursor-pointer"
                    }`}
                >
                  {item.icon && <item.icon className="h-4 w-4 shrink-0" />}

                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
};

export default ActionDropdown;