export const WEEK_DAYS = [
  { id: 'mon', label: 'Monday', short: 'Mon' },
  { id: 'tue', label: 'Tuesday', short: 'Tue' },
  { id: 'wed', label: 'Wednesday', short: 'Wed' },
  { id: 'thu', label: 'Thursday', short: 'Thu' },
  { id: 'fri', label: 'Friday', short: 'Fri' },
  { id: 'sat', label: 'Saturday', short: 'Sat' },
  { id: 'sun', label: 'Sunday', short: 'Sun' },
];

export const TIME_SLOTS = Array.from({ length: 15 }, (_, i) => {
  const hour = i + 8;
  return `${String(hour).padStart(2, '0')}:00`;
});

export function defaultAvailability() {
  return WEEK_DAYS.reduce((days, { id }) => {
    days[id] = {
      enabled: id !== 'sun',
      start: '10:00',
      end: id === 'sat' ? '16:00' : '18:00',
    };
    return days;
  }, {});
}

export function mergeAvailability(raw) {
  const defaults = defaultAvailability();
  if (!raw || typeof raw !== 'object') return defaults;
  return WEEK_DAYS.reduce((days, { id }) => {
    const next = raw[id] || {};
    days[id] = {
      enabled: Boolean(next.enabled),
      start: TIME_SLOTS.includes(next.start) ? next.start : defaults[id].start,
      end: TIME_SLOTS.includes(next.end) ? next.end : defaults[id].end,
    };
    return days;
  }, {});
}

export function formatSlot(hhmm) {
  const [hourStr, minuteStr] = String(hhmm || '00:00').split(':');
  const hour = Number(hourStr);
  const minute = minuteStr || '00';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hr = hour % 12 || 12;
  return `${hr}:${minute} ${ampm}`;
}

export function summarizeDay(day) {
  if (!day?.enabled) return 'Unavailable';
  return `${formatSlot(day.start)} – ${formatSlot(day.end)}`;
}
