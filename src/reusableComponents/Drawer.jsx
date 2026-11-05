import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const POSITION_CLASSES = {
    right: "right-0 top-0 h-full",
    left: "left-0 top-0 h-full",
    top: "top-0 left-0 w-full",
    bottom: "bottom-0 left-0 w-full",
};

const CLOSED_TRANSFORM = {
    right: "translate-x-full",
    left: "-translate-x-full",
    top: "-translate-y-full",
    bottom: "translate-y-full",
};

const DEFAULT_SIZE_CLASS = {
    right: "w-full max-w-md",
    left: "w-full max-w-md",
    top: "max-h-[80vh]",
    bottom: "max-h-[80vh]",
};

const Drawer = ({
    isOpen,
    onClose,
    direction = "right",
    size,
    className = "",
    overlayClassName = "",
    title,
    showCloseButton = true,
    closeOnOverlayClick = true,
    closeOnEsc = true,
    footer,
    scrollable = true,
    children,
}) => {
    const [shouldRender, setShouldRender] = useState(isOpen);
    const [visible, setVisible] = useState(false);
    const panelRef = useRef(null);

    const isHorizontal = direction === "left" || direction === "right";

    // Mount immediately on open; wait a frame before flipping the
    // "visible" flag so the transform transition actually animates in
    // (mounting with the open transform already applied would just snap).
    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            const raf = requestAnimationFrame(() =>
                requestAnimationFrame(() => setVisible(true)),
            );
            return () => cancelAnimationFrame(raf);
        }
        setVisible(false);
    }, [isOpen]);

    // Unmount only after the close transition finishes.
    const handleTransitionEnd = (e) => {
        if (e.target !== panelRef.current) return;
        if (!isOpen) setShouldRender(false);
    };

    // Lock background scroll while open.
    useEffect(() => {
        if (!shouldRender) return;
        const original = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = original;
        };
    }, [shouldRender]);

    // Close on Escape.
    useEffect(() => {
        if (!closeOnEsc || !isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === "Escape") onClose?.();
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [closeOnEsc, isOpen, onClose]);

    if (!shouldRender) return null;

    const sizeStyle = size
        ? isHorizontal
            ? { width: size, maxWidth: "100vw" }
            : { height: size, maxHeight: "100vh" }
        : undefined;

    return createPortal(
        <div className="fixed inset-0 z-[50]">
            {/* Overlay */}
            <div
                className={`absolute inset-0 bg-black/40 dark:bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"
                    } ${overlayClassName}`}
                onClick={closeOnOverlayClick ? onClose : undefined}
            />

            {/* Panel */}
            <div
                ref={panelRef}
                onTransitionEnd={handleTransitionEnd}
                role="dialog"
                aria-modal="true"
                aria-label={title || "Drawer"}
                style={sizeStyle}
                className={`absolute flex flex-col bg-white dark:bg-[#131316] border-l dark:border-[#33333a] shadow-2xl dark:shadow-[0_0_30px_rgba(0,0,0,0.7)] transition-transform duration-300 ease-out ${POSITION_CLASSES[direction]
                    } ${!size ? DEFAULT_SIZE_CLASS[direction] : ""} ${visible ? "translate-x-0 translate-y-0" : CLOSED_TRANSFORM[direction]
                    } ${className}`}
            >
                {(title || showCloseButton) && (
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#33333a] px-5 py-4 dark:bg-[#131316]">
                        {title && (
                            <h2 className="text-sm font-semibold text-slate-800 dark:text-zinc-100">{title}</h2>
                        )}
                        {showCloseButton && (
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg p-1.5 text-slate-400 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#1e1e23] hover:text-slate-600 dark:hover:text-zinc-200"
                                aria-label="Close"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                )}

                <div
                    className={`flex-1 min-h-0 ${
                        scrollable ? "overflow-y-auto" : "flex flex-col"
                    }`}
                >
                    {children}
                </div>

                {footer && (
                    <div className="border-t border-slate-200 dark:border-[#33333a] px-5 py-4 dark:bg-[#18181c]">{footer}</div>
                )}
            </div>
        </div>,
        document.body,
    );
};

export default Drawer;