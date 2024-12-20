import { User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import type { EventWithAttendees } from '@/types/events';

interface EventDetailContentProps {
  event: EventWithAttendees;
}

export function EventDetailContent({ event }: EventDetailContentProps) {
  const attendees = event.attendees?.filter(a => a.status === 'attending') || [];

  return (
    <div className="mt-8 space-y-8 md:mt-12 md:grid md:grid-cols-3 md:gap-8 md:space-y-0">
      <div className="md:col-span-2 space-y-8">
        <section>
          <h2 className="text-lg font-semibold mb-4">About this event</h2>
          <div className="prose max-w-none">
            <p className="text-muted-foreground whitespace-pre-wrap">
              {event.description}
            </p>
          </div>
        </section>

        {event.is_online && (
          <section>
            <h2 className="text-lg font-semibold mb-4">How to join</h2>
            <p className="text-muted-foreground">
              The meeting link will be provided after you RSVP.
            </p>
          </section>
        )}
      </div>

      <div className="space-y-8">
        <section>
          <h2 className="text-lg font-semibold mb-4">Attendees ({attendees.length})</h2>
          <div className="flex flex-wrap gap-2">
            {attendees.map((attendee) => (
              <Avatar key={attendee.profile?.id}>
                <AvatarImage src={attendee.profile?.avatar_url ?? undefined} />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          {event.max_attendees && (
            <p className="text-sm text-muted-foreground mt-4">
              {attendees.length} of {event.max_attendees} spots filled
            </p>
          )}
        </section>

        {!event.is_online && event.location && (
          <section>
            <h2 className="text-lg font-semibold mb-4">Location</h2>
            <div className="aspect-video rounded-lg bg-muted" />
            <p className="text-sm text-muted-foreground mt-2">
              {event.location}
            </p>
          </section>
        )}
      </div>
    </div>
  );
}