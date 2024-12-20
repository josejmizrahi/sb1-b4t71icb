import { format } from 'date-fns';
import { Calendar, MapPin, Users, Globe, Clock } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useAuth } from '@/lib/auth/AuthContext';
import type { EventWithAttendees } from '@/types/events';

interface EventDetailsProps {
  event: EventWithAttendees;
  onJoin?: () => void;
  onLeave?: () => void;
  isAttending?: boolean;
}

export function EventDetails({ 
  event, 
  onJoin, 
  onLeave,
  isAttending 
}: EventDetailsProps) {
  const { user } = useAuth();
  const attendeeCount = event.attendees?.filter(a => a.status === 'attending').length || 0;
  const isFull = event.max_attendees !== null && attendeeCount >= event.max_attendees;
  const isCreator = event.creator_id === user?.id;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Badge>{event.event_type}</Badge>
          {event.is_online && (
            <Badge variant="secondary">Online Event</Badge>
          )}
        </div>
        <CardTitle className="text-2xl">{event.title}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="prose max-w-none">
          <p>{event.description}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center text-sm">
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              {format(new Date(event.start_time), 'PPP')}
            </div>

            <div className="flex items-center text-sm">
              <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
              {format(new Date(event.start_time), 'p')}
              {event.end_time && ` - ${format(new Date(event.end_time), 'p')}`}
            </div>

            {event.is_online ? (
              <div className="flex items-center text-sm">
                <Globe className="h-4 w-4 mr-2 text-muted-foreground" />
                Online via {new URL(event.meeting_link || '').hostname}
              </div>
            ) : event.location && (
              <div className="flex items-center text-sm">
                <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                {event.location}
              </div>
            )}

            <div className="flex items-center text-sm">
              <Users className="h-4 w-4 mr-2 text-muted-foreground" />
              {event.max_attendees 
                ? `${attendeeCount}/${event.max_attendees} attendees`
                : `${attendeeCount} attendees`
              }
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium">Attendees</h3>
            <div className="flex flex-wrap gap-2">
              {event.attendees?.map((attendee) => (
                <Avatar key={attendee.profile.id} className="h-8 w-8">
                  <AvatarImage src={attendee.profile.avatar_url ?? undefined} />
                  <AvatarFallback>
                    {attendee.profile.display_name?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
          </div>
        </div>
      </CardContent>

      {!isCreator && (
        <CardFooter>
          {isAttending ? (
            <Button 
              variant="outline" 
              onClick={onLeave}
              className="w-full"
            >
              Cancel Attendance
            </Button>
          ) : (
            <Button 
              onClick={onJoin}
              className="w-full"
              disabled={isFull}
            >
              {isFull ? 'Event Full' : 'Join Event'}
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}