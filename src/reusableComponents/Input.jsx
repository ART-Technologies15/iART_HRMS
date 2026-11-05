import { forwardRef, useRef, useState } from "react";
import { Eye, EyeOff, X } from "lucide-react";

// Keeps a leading "+" only if it was the first character typed
function sanitizePhoneValue(value) {
  const hasLeadingPlus = value.startsWith("+");
  const digits = value.replace(/\D/g, "");
  return (hasLeadingPlus ? "+" : "") + digits;
}

const Input = forwardRef(
  (
    {
      label,
      name,
      type = "text",
      error,
      icon: Icon,
      hint,
      className = "",
      value,
      onChange,
      onKeyDown,
      min,
      disabled = false,
      readOnly = false,

      // Show an "X" on the right when the field has text, so the user can
      // clear it. Off by default, pass isCrossAble to enable.
      isCrossAble = false,

      ...rest
    },
    ref,
  ) => {
    const [show, setShow] = useState(false);
    const inputRef = useRef(null);

    // Keep the forwarded ref working while also holding our own for focus
    const setRefs = (node) => {
      inputRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    };

    const isPassword = type === "password";
    const isPhone = type === "tel";
    const isNumber = type === "number";

    const inputType = isPassword ? (show ? "text" : "password") : type;

    // Only shows when the feature is on, the field is editable and has text
    const hasValue = value !== undefined && value !== null && String(value) !== "";
    const showClear = isCrossAble && !disabled && !readOnly && hasValue;

    const handleClear = (e) => {
      e.stopPropagation();

      // Uncontrolled inputs keep their own text, so reset the DOM value too
      if (value === undefined && inputRef.current) {
        inputRef.current.value = "";
      }

      onChange?.({ target: { name, value: "" } });
      inputRef.current?.focus();
    };

    const handlePhoneChange = (e) => {
      const sanitized = sanitizePhoneValue(e.target.value);

      e.target.value = sanitized;

      onChange?.(e);
    };

    const handleNumberChange = (e) => {
      let next = e.target.value;

      // Remove negative sign
      next = next.replace(/-/g, "");

      // Remove +, e and E
      next = next.replace(/[eE+]/g, "");

      // Allow only numbers and decimal point
      next = next.replace(/[^0-9.]/g, "");

      // Allow only one decimal point
      const parts = next.split(".");

      if (parts.length > 2) {
        next = `${parts[0]}.${parts.slice(1).join("")}`;
      }

      e.target.value = next;

      onChange?.(e);
    };

    const handleKeyDown = (e) => {
      if (isNumber) {
        // Prevent negative numbers and scientific notation
        if (e.key === "-" || e.key === "+" || e.key === "e" || e.key === "E") {
          e.preventDefault();
        }
      }

      onKeyDown?.(e);
    };

    // Right padding: room for the X, and for the X plus the password eye
    const rightPadding = isPassword
      ? showClear
        ? "pr-16"
        : "pr-10"
      : showClear
        ? "pr-9"
        : "";

    return (
      <div className={className}>
        {label && (
          <label htmlFor={name} className="label">
            {label}
          </label>
        )}

        <div className="relative">
          {Icon && (
            <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          )}

          <input
            ref={setRefs}
            id={name}
            name={name}
            type={inputType}
            value={value}
            disabled={disabled}
            readOnly={readOnly}
            min={isNumber ? (min ?? 0) : undefined}
            inputMode={isPhone ? "tel" : isNumber ? "decimal" : undefined}
            onChange={
              isPhone
                ? handlePhoneChange
                : isNumber
                  ? handleNumberChange
                  : onChange
            }
            onKeyDown={handleKeyDown}
            className={`input dark:bg-[#131316] dark:border-[#33333a] dark:text-zinc-100 dark:placeholder:text-zinc-500 focus:border-[#183C31] dark:focus:border-sky-400 focus:ring-1 focus:ring-[#183C31]/20 dark:focus:ring-sky-400/20 ${Icon ? "pl-10" : ""
              } ${rightPadding} ${error
                ? "border-error-500 focus:border-error-500 focus:ring-error-200"
                : ""
              }`}
            {...rest}
          />

          {/* Clear (X) button. Sits left of the password eye when both show. */}
          {showClear && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear input"
              tabIndex={-1}
              className={`absolute top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 dark:text-zinc-400 transition-colors hover:bg-slate-100 dark:hover:bg-[#1e1e23] hover:text-slate-700 dark:hover:text-zinc-200 ${isPassword ? "right-9" : "right-3"
                }`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {isPassword && (
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-400 hover:text-slate-600 dark:hover:text-zinc-200"
              tabIndex={-1}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>

        {hint && !error && (
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">{hint}</p>
        )}

        {error && <p className="mt-1 text-xs text-error-600">{error}</p>}
      </div>
    );
  },
);

Input.displayName = "Input";

export default Input;