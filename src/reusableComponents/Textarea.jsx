import { forwardRef } from "react";

/**
 * Textarea — same label/error/hint pattern as Input and Select.
 *
 * Props:
 *  - label, name, error, hint, className   (same as Input)
 *  - rows: default 4
 */
const Textarea = forwardRef(
    ({ label, name, error, hint, rows = 4, className = "", ...rest }, ref) => {
        return (
            <div className={className}>
                {label && (
                    <label htmlFor={name} className="label">
                        {label}
                    </label>
                )}
                <textarea
                    ref={ref}
                    id={name}
                    name={name}
                    rows={rows}
                    className={`input resize-y dark:bg-[#131316] dark:border-[#33333a] dark:text-zinc-100 dark:placeholder:text-zinc-500 ${error
                            ? "border-error-500 focus:border-error-500 focus:ring-error-200"
                            : "focus:border-[#183C31] dark:focus:border-sky-400 focus:ring-1 focus:ring-[#183C31]/20 dark:focus:ring-sky-400/20"
                        }`}
                    {...rest}
                />
                {hint && !error && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">{hint}</p>
                )}
                {error && <p className="mt-1 text-xs text-error-600">{error}</p>}
            </div>
        );
    },
);

Textarea.displayName = "Textarea";
export default Textarea;