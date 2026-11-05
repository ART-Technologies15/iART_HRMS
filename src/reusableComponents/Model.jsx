import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const sizes = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  footer,
  closeOnBackdrop = true,
  className = "px-6 py-5",
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };

    document.addEventListener("keydown", onKey);

    // Prevent background scrolling
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={closeOnBackdrop ? onClose : undefined}
      />

      {/* Modal */}
      <div
        className={`
          relative z-10
          w-full
          ${sizes[size] || sizes.md}
          max-h-[90vh]
          overflow-hidden
          rounded-2xl
          bg-white dark:bg-[#131316]
          border border-transparent dark:border-[#33333a]
          shadow-card dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)]
          animate-slide-up
          flex flex-col
        `}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#212125] px-6 py-4 dark:bg-[#131316]">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-zinc-100">{title}</h2>

            <button
              type="button"
              onClick={onClose}
              className="
                rounded-lg
                p-1.5
                text-slate-400 dark:text-zinc-400
                transition-colors
                hover:bg-slate-100 dark:hover:bg-[#1e1e23]
                hover:text-slate-600 dark:hover:text-zinc-200
              "
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className={`flex-1 overflow-y-auto ${className}`}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-[#212125] bg-slate-100 dark:bg-[#18181c] px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  // Render modal directly inside document.body
  return createPortal(modalContent, document.body);
};

export default Modal;
