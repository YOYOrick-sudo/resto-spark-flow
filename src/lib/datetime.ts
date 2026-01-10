/**
 * Format ISO timestamp to compact display format
 * Examples: "14:30", "Gisteren 14:30", "8 jan 14:30"
 */
export function formatDateTimeCompact(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const time = date.toLocaleTimeString('nl-NL', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  // Vandaag: alleen tijd
  if (isSameDay(date, now)) {
    return time;
  }
  
  // Gisteren
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(date, yesterday)) {
    return `Gisteren ${time}`;
  }
  
  // Ouder: datum + tijd compact
  const day = date.getDate();
  const month = date.toLocaleDateString('nl-NL', { month: 'short' });
  return `${day} ${month} ${time}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}
