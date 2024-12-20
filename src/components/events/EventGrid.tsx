import { EventCard } from './EventCard';
import type { EventWithAttendees } from '@/types/events';

interface EventGridProps {
  events: EventWithAttendees[];
  userId?: string;
  onJoin: (eventId: string) => void;
  onLeave: (eventId: string) => void;
}

export function EventGrid({ events, userId, onJoin, onLeave }: EventGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map((event) => {
        // Ensure attendees is always an array
        const attendees = event.attendees || [];
        
        // Check if user is attending
        const isAttending = userId ? attendees.some(
          attendee => 
            attendee.profile?.id === userId && 
            attendee.status === 'attending'
        ) : false;

        return (
          <EventCard
            key={event.id}
            event={{
              ...event,
              attendees: attendees
            }}
            onJoin={onJoin}
            onLeave={onLeave}
            isAttending={isAttending}
          />
        );
      })}
    </div>
  );
}