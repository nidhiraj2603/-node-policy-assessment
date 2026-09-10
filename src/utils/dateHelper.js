/**
 * Helper to parse various formats of 'day' and 'time' into a target Date object.
 * 
 * Supports:
 * - Day: 'YYYY-MM-DD', 'MM/DD/YYYY', 'today', 'tomorrow', or weekdays like 'Monday', 'Tuesday'
 * - Time: 'HH:mm', 'HH:mm:ss', 'h:mm A', 'h:mm PM'
 */
function parseScheduledDateTime(dayInput, timeInput) {
  if (!dayInput || typeof dayInput !== 'string') {
    throw new Error("Invalid 'day' parameter. Must be a non-empty string (e.g. 'YYYY-MM-DD' or 'today').");
  }
  if (!timeInput || typeof timeInput !== 'string') {
    throw new Error("Invalid 'time' parameter. Must be a non-empty string (e.g. '14:30' or '14:30:00').");
  }

  const now = new Date();
  let targetDate = new Date();

  const trimmedDay = dayInput.trim().toLowerCase();

  if (trimmedDay === 'today') {
    targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (trimmedDay === 'tomorrow') {
    targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  } else {
    // Check if it's a weekday name (e.g. "Monday")
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayIndex = daysOfWeek.indexOf(trimmedDay);

    if (dayIndex !== -1) {
      const currentDay = now.getDay();
      let diff = dayIndex - currentDay;
      if (diff <= 0) diff += 7; // Next occurrence
      targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
    } else {
      // Try standard date parsing (e.g., 'YYYY-MM-DD')
      const parsed = new Date(dayInput.trim());
      if (isNaN(parsed.getTime())) {
        throw new Error(`Unrecognized day format: '${dayInput}'. Use 'YYYY-MM-DD', 'today', 'tomorrow', or day of week.`);
      }
      targetDate = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    }
  }

  // Parse time input
  const timeRegex = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?$/i;
  const match = timeInput.trim().match(timeRegex);

  if (!match) {
    throw new Error(`Unrecognized time format: '${timeInput}'. Use 'HH:mm', 'HH:mm:ss' (24-hour) or 'h:mm AM/PM'.`);
  }

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = match[3] ? parseInt(match[3], 10) : 0;
  const modifier = match[4] ? match[4].toLowerCase() : null;

  if (modifier === 'pm' && hours < 12) hours += 12;
  if (modifier === 'am' && hours === 12) hours = 0;

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
    throw new Error(`Invalid time values in '${timeInput}'.`);
  }

  targetDate.setHours(hours, minutes, seconds, 0);

  return targetDate;
}

module.exports = {
  parseScheduledDateTime
};
