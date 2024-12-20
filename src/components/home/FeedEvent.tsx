import { Calendar, MessageSquare, Share2, ThumbsUp, User } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Card } from '../ui/card';
import { ActionButton } from '../ui/action-button';
import type { EventWithAttendees } from '@/types/events';

interface FeedEventProps {
  event: EventWithAttendees;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onJoin?: () => void;
}

export function FeedEvent({ event, onLike, onComment, onShare, onJoin }: FeedEventProps) {
  const navigate = useNavigate();
  const attendeeCount = event.attendees?.filter(a => a.status === 'attending').length || 0;
  const isFull = event.max_attendees !== null && attendeeCount >= event.max_attendees;

  const handleClick = () => {
    navigate(`/events/${event.id}`);
  };

  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <Card 
      className="overflow-hidden hover:border-primary/20 transition-colors cursor-pointer" 
      onClick={handleClick}
    >
      <div className="p-6">
        {/* Header content */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={event.creator?.avatar_url ?? undefined} />
              <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{event.creator?.display_name}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(event.created_at), 'MMM d')}
              </p>
            </div>
          </div>
          <div className="flex-shrink-0 p-2 bg-primary/10 rounded-lg">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Event</Badge>
            <Badge>{event.event_type}</Badge>
          </div>

          <div>
            <h3 className="font-medium">{event.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {event.description}
            </p>
          </div>

          <p className="text-sm text-muted-foreground">
            {format(new Date(event.start_time), 'PPp')} • {attendeeCount} attending
          </p>

          <div className="flex justify-end">
            <ActionButton 
              type="event" 
              onClick={(e) => handleAction(e, onJoin!)}
              disabled={isFull}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 pt-4 border-t flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => handleAction(e, onLike!)}
            >
              <ThumbsUp className="h-4 w-4 mr-2" />
              Like
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => handleAction(e, onComment!)}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Comment
            </Button>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={(e) => handleAction(e, onShare!)}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>
    </Card>
  );
}