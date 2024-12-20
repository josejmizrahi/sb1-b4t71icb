import { EventWithAttendees } from '@/types/events';
import { isAfter, isSameDay, parseISO } from 'date-fns';

export function filterEvents(
  events: EventWithAttendees[],
  filters: {
    search: string;
    type: string;
    date?: Date;
    location: string;
  }
): EventWithAttendees[] {
  return events
    .filter((event) => {
      // Search filter
      const searchMatch = filters.search
        ? event.title.toLowerCase().includes(filters.search.toLowerCase()) ||
          event.description.toLowerCase().includes(filters.search.toLowerCase())
        : true;

      // Type filter
      const typeMatch = filters.type === 'all' || event.event_type === filters.type;

      // Date filter
      const dateMatch = !filters.date || isSameDay(parseISO(event.start_time), filters.date);

      // Location filter
      const locationMatch = filters.location === 'all' ||
        (filters.location === 'online' && event.is_online) ||
        (filters.location === 'in-person' && !event.is_online);

      // Only show upcoming events
      const isUpcoming = isAfter(parseISO(event.start_time), new Date());

      return searchMatch && typeMatch && dateMatch && locationMatch && isUpcoming;
    })
    .sort((a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime());
}