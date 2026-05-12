/**
 * Converts a 12-hour time string (e.g. "07:30 AM", "7:30PM") 
 * to 24-hour format "HH:mm".
 */
function getTimeIn24HourFormat(timeStr: string): string {
    if (!timeStr || typeof timeStr !== 'string') {
        throw new Error('Invalid time string');
    }

    const cleaned = timeStr.trim().toUpperCase();
    
    // Already 24-hour? Just normalize to HH:mm
    if (!cleaned.includes('AM') && !cleaned.includes('PM')) {
        const [h, m] = cleaned.split(':');
        return `${h.padStart(2, '0')}:${m?.padStart(2, '0') ?? '00'}`;
    }

    // Parse 12-hour format
    const match = cleaned.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/);
    if (!match) {
        throw new Error(`Unable to parse time: ${timeStr}`);
    }

    let [, hours, minutes, meridiem] = match;
    let h = parseInt(hours, 10);

    if (meridiem === 'PM' && h !== 12) h += 12;
    if (meridiem === 'AM' && h === 12) h = 0;

    return `${String(h).padStart(2, '0')}:${minutes}`;
}