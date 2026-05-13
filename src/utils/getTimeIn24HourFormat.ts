/**
 * Converts various time string formats to 24-hour "HHMM" (CF Express format).
 * Handles: "0800", "08:00", "8:00 AM", "10:00PM", "10:00:00 PM", null/undefined
 */
export function getTimeIn24HourFormat(timeStr: string | null | undefined, fallback = "0800"): string {
  if (!timeStr || typeof timeStr !== "string") return fallback;

  const cleaned = timeStr.trim().toUpperCase().replace(/\s+/g, "");

  // Already HHMM (4 digits, no colon, no AM/PM)
  if (/^\d{4}$/.test(cleaned)) {
    const h = parseInt(cleaned.slice(0, 2), 10);
    const m = parseInt(cleaned.slice(2), 10);
    if (h > 23 || m > 59) return fallback;
    return cleaned;
  }

  // HH:mm 24-hour format (no AM/PM)
  if (!cleaned.includes("AM") && !cleaned.includes("PM")) {
    const match = cleaned.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (!match) return fallback;
    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    if (h > 23 || m > 59) return fallback;
    return `${String(h).padStart(2, "0")}${String(m).padStart(2, "0")}`;
  }

  // Has AM/PM. Check if it's actually 24h time with erroneous suffix (e.g. "21:00AM", "13:30PM")
  const stripped = cleaned.replace(/(AM|PM)$/g, "");
  const twentyFourMatch = stripped.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (twentyFourMatch) {
    const h = parseInt(twentyFourMatch[1], 10);
    if (h > 12) {
      // Treat as 24-hour time, ignore the bogus AM/PM
      const m = parseInt(twentyFourMatch[2], 10);
      if (h > 23 || m > 59) return fallback;
      return `${String(h).padStart(2, "0")}${String(m).padStart(2, "0")}`;
    }
  }

  // Strict 12-hour parse (hours must be 1-12)
  const match = cleaned.match(/^(\d{1,2}):(\d{2})(?::\d{2})?(AM|PM)$/);
  if (!match) return fallback;

  let [, hours, minutes, meridiem] = match;
  let h = parseInt(hours, 10);

  if (h < 1 || h > 12) return fallback; // Invalid 12-hour time

  if (meridiem === "PM" && h !== 12) h += 12;
  if (meridiem === "AM" && h === 12) h = 0;

  return `${String(h).padStart(2, "0")}${minutes}`;
}