import { forwardRef } from "react";
import moment from "moment-timezone";
import { useAuthContext } from "../../features/auth/AuthContext";

const DEFAULT_TIMEZONE = "Africa/Nairobi";

/**
 * useUserTimezone — the ONLY place `useAuthContext()` is called in this
 * file. This is a proper custom hook (starts with `use`, calls another
 * hook at its top level), so it's safe to call from any component body.
 * Call this once in your component, then pass the resulting string into
 * `toUTCISOString`/`fromUTCISOString`/`formatUTCDateTime` below — those
 * stay plain functions precisely so they CAN be called from event
 * handlers, table `render()` callbacks, and `useState` initializers,
 * none of which are valid places to call a Hook.
 */
export function useUserTimezone() {
  const { user } = useAuthContext();
  return user?.timeZone || DEFAULT_TIMEZONE;
}

/**
 * DateTimePicker — native browser date/time picker.
 *
 * The value returned by the picker is: YYYY-MM-DDTHH:mm
 *
 * Use `toUTCISOString(value, timezone)` before sending the value to the API.
 * Use `fromUTCISOString(isoStr, timezone)` when loading a saved UTC value
 * into the picker. Get `timezone` via `useUserTimezone()` in the parent
 * component and pass it down — see usage notes below.
 */
const DateTimePicker = forwardRef(
  ({ label, name, error, hint, className = "", ...rest }, ref) => {
    // Safe here: this IS the component body, called once per render, always
    // in the same position — exactly what Hooks require.
    const timezone = useUserTimezone();

    return (
      <div className={className}>
        {label && (
          <label htmlFor={name} className="label">
            {label}
          </label>
        )}

        <input
          ref={ref}
          id={name}
          name={name}
          type="datetime-local"
          className={`input dark:bg-[#131316] dark:border-[#33333a] dark:text-zinc-100 ${error ? "border-error-500 focus:border-error-500 focus:ring-error-200" : "focus:border-[#183C31] dark:focus:border-sky-400 focus:ring-1 focus:ring-[#183C31]/20 dark:focus:ring-sky-400/20"
            }`}
          {...rest}
        />

        {hint && !error && <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">{hint}</p>}

        {/* {!hint && !error && (
          <p className="mt-1 text-[11px] text-slate-400">Times shown in {timezone}</p>
        )} */}

        {error && <p className="mt-1 text-xs text-error-600">{error}</p>}
      </div>
    );
  },
);

DateTimePicker.displayName = "DateTimePicker";

export default DateTimePicker;

/**
 * Converts a UTC ISO string into the value required by
 * <input type="datetime-local">, rendered in `timezone`.
 *
 * NOT a hook — plain function. Pass the timezone in explicitly (get it
 * from `useUserTimezone()` inside your component, once).
 *
 * Example:
 *   fromUTCISOString("2026-09-30T15:32:00.000Z", "Asia/Kolkata")
 *   → "2026-09-30T21:02"
 */
export const fromUTCISOString = (isoStr, timezone = DEFAULT_TIMEZONE) => {
  if (!isoStr) return "";

  const date = moment.utc(isoStr).tz(timezone);
  return date.isValid() ? date.format("YYYY-MM-DDTHH:mm") : "";
};

/**
 * Converts a datetime-local value (wall-clock time in `timezone`) into a
 * UTC ISO string, safe to send to the API.
 *
 * Example:
 *   toUTCISOString("2026-09-30T21:02", "Asia/Kolkata")
 *   → "2026-09-30T15:32:00.000Z"
 */
export const toUTCISOString = (localDateTimeStr, timezone = DEFAULT_TIMEZONE) => {
  if (!localDateTimeStr) return "";

  const date = moment.tz(localDateTimeStr, timezone);
  return date.isValid() ? date.utc().toISOString() : "";
};

/**
 * Formats a UTC ISO string into a readable date/time for UI, in `timezone`.
 *
 * @param {string} isoStr
 * @param {string} timezone
 * @param {Object} options
 * @param {boolean} options.showTime
 * @param {boolean} options.showTimezone
 */
export const formatUTCDateTime = (
  isoStr,
  timezone = DEFAULT_TIMEZONE,
  { showTime = true, showTimezone = false } = {},
) => {
  if (!isoStr) return "";

  const date = moment.utc(isoStr).tz(timezone);
  if (!date.isValid()) return "";

  if (!showTime) return date.format("MMMM D, YYYY");
  if (showTimezone) return date.format("MMMM D, YYYY [at] hh:mm A z");
  return date.format("MMMM D, YYYY [at] hh:mm A");
};