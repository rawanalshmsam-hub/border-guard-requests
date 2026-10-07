// Colours per calendar event type
export const EVENT_COLORS = {
  leave: { bg: '#e6f4ec', fg: '#1f8a5b' },
  return: { bg: '#e8f0fb', fg: '#2f5fa7' },
  shift: { bg: '#f3e8fd', fg: '#6a3fb5' },
  course: { bg: '#fff4e5', fg: '#b26a00' },
  mission: { bg: '#eef1ef', fg: '#3d4a43' },
  medical: { bg: '#fdecec', fg: '#c62828' },
};

export const eventColor = (type) => EVENT_COLORS[type] || EVENT_COLORS.mission;

/** Full title: own events show the request type; others show only "leave — rank name" (privacy rule). */
export function eventTitle(e) {
  if (e.is_mine) return e.request_type_name || e.title;
  return `${e.title} — ${[e.person.rank, e.person.full_name].filter(Boolean).join(' ')}`;
}

/** Very short label for a day cell: "إجازتي" or the person's first + last name. */
export function eventShortLabel(e) {
  if (e.is_mine) return e.type === 'leave' ? 'إجازتي' : e.title;
  const parts = e.person.full_name.split(' ').filter(Boolean);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]}` : parts[0];
}

/** Events that cover the given ISO day. */
export const eventsOnDay = (events, iso) => events.filter((e) => e.date_from <= iso && iso <= e.date_to);