import { format } from 'date-fns';
import { Calendar, MapPin, Globe, Share2, User, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useNavigate } from 'react-router-dom';
import type { EventWithAttendees } from '@/types/events';

interface EventDetailHeaderProps {
  event: EventWithAttendees;
  isAttending?: boolean;
  onJoin: () => void;
  onLeave: () => void;
  onShare: () => void;
}

export function EventDetailHeader({ 
  event, 
  isAttending,
  onJoin,
  onLeave,
  onShare 
}: EventDetailHeaderProps) {
  const navigate = useNavigate();
  const attendeeCount = event.attendees?.filter(a => a.status === 'attending').length || 0;

  return (
    <div className="relative space-y-6">
      {/* Back button and share - Mobile */}
      <div className="flex items-center justify-between md:hidden">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onShare}
        >
          <Share2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Hero Image */}
      <div className="aspect-video w-full overflow-hidden rounded-lg md:rounded-xl">
        <img
          src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80"
          alt={event.title}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Content */}
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{event.event_type}</Badge>
            {event.is_online && (
              <Badge variant="secondary">Online Event</Badge>
            )}
          </div>
          
          <h1 className="text-2xl font-bold md:text-3xl">{event.title}</h1>

          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={event.creator?.avatar_url ?? undefined} />
              <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
            </Avatar>
            <span className="text-muted-foreground">
              by {event.creator?.display_name || 'Anonymous'}
            </span>
          </div>
        </div>

        <div className="bg-card rounded-lg p-4 md:p-6 space-y-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{format(new Date(event.start_time), 'EEE, MMM d • h:mm a')}</span>
            </div>

            {event.is_online ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Globe className="h-4 w-4" />
                <span>Online Event</span>
              </div>
            ) : event.location && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{event.location}</span>
              </div>
            )}

            <div className="text-sm text-muted-foreground">
              {event.max_attendees 
                ? `${attendeeCount}/${event.max_attendees} attendees`
                : `${attendeeCount} attendees`
              }
            </div>
          </div>
        </div>

        {/* Share button - Desktop */}
        <div className="hidden md:flex items-center justify-between">
          <Button
            variant="outline"
            size="icon"
            onClick={onShare}
          >
            <Share2 className="h-4 w-4" />
          </Button>

          <Button
            variant={isAttending ? "outline" : "default"}
            onClick={isAttending ? onLeave : onJoin}
            className="min-w-[120px]"
          >
            {isAttending ? 'Cancel RSVP' : 'RSVP Now'}
          </Button>
        </div>

        {/* Action button - Mobile */}
        <div className="md:hidden">
          <Button
            onClick={isAttending ? onLeave : onJoin}
            variant={isAttending ? "outline" : "default"}
            className="w-full"
            size="lg"
          >
            {isAttending ? 'Cancel RSVP' : 'RSVP Now'}
          </Button>
        </div>
      </div>
    </div>
  );
}