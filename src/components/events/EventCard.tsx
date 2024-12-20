import { Calendar, MapPin, Users, Globe } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import type { EventWithAttendees } from '@/types/events';

interface EventCardProps {
  event: EventWithAttendees;
  onJoin?: (eventId: string) => void;
  onLeave?: (eventId: string) => void;
  isAttending?: boolean;
}

export function EventCard({ 
  event, 
  onJoin, 
  onLeave,
  isAttending 
}: EventCardProps) {
  const attendeeCount = event.attendees?.filter(a => a.status === 'attending').length || 0;

  return (
    <div className="group bg-white rounded-lg border hover:border-primary/20 transition-colors">
      <div className="p-4 space-y-4">
        {/* Event Type & Online Badge */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="capitalize bg-primary/5 text-primary border-primary/20">
            {event.event_type}
          </Badge>
          {event.is_online && (
            <Badge variant="outline" className="bg-secondary/5 text-secondary-foreground border-secondary/20">
              Online
            </Badge>
          )}
        </div>

        {/* Event Title & Description */}
        <div>
          <h3 className="text-base font-medium">{event.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {event.description}
          </p>
        </div>

        {/* Event Details */}
        <div className="space-y-1.5 text-sm">
          <div className="flex items-center text-muted-foreground">
            <Calendar className="h-4 w-4 mr-2 shrink-0" />
            <span>{format(new Date(event.start_time), 'EEE, MMM d • h:mm a')}</span>
          </div>
          
          {event.is_online ? (
            <div className="flex items-center text-muted-foreground">
              <Globe className="h-4 w-4 mr-2 shrink-0" />
              <span>Online Event</span>
            </div>
          ) : event.location && (
            <div className="flex items-center text-muted-foreground">
              <MapPin className="h-4 w-4 mr-2 shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
          )}

          <div className="flex items-center text-muted-foreground">
            <Users className="h-4 w-4 mr-2 shrink-0" />
            <span>
              {event.max_attendees 
                ? `${attendeeCount}/${event.max_attendees} attendees`
                : `${attendeeCount} attendees`
              }
            </span>
          </div>
        </div>

        {/* Action Button */}
        {isAttending ? (
          <Button 
            variant="outline" 
            onClick={() => onLeave?.(event.id)}
            className="w-full mt-2"
            size="sm"
          >
            Cancel Attendance
          </Button>
        ) : (
          <Button 
            onClick={() => onJoin?.(event.id)}
            className="w-full mt-2"
            size="sm"
            disabled={event.max_attendees !== null && attendeeCount >= event.max_attendees}
          >
            {event.max_attendees !== null && attendeeCount >= event.max_attendees
              ? 'Event Full'
              : 'Join Event'
            }
          </Button>
        )}
      </div>
    </div>
  );
}