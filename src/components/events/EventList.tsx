import { useEvents } from '@/hooks/useEvents';
import { useAuth } from '@/lib/auth/AuthContext';
import { usePoints } from '@/hooks/usePoints';
import { filterEvents } from '@/lib/utils/eventFilters';
import { LoadingSpinner } from '../ui/loading-spinner';
import { EmptyState } from '../ui/empty-state';
import { Calendar } from 'lucide-react';
import { EventGrid } from './EventGrid';
import { joinEvent, leaveEvent } from '@/lib/api/events';
import { useToast } from '../ui/use-toast';

interface EventListProps {
  filters: {
    search: string;
    type: string;
    date?: Date;
    location: string;
  };
}

export function EventList({ filters }: EventListProps) {
  const { user } = useAuth();
  const { events, loading, error, refresh } = useEvents();
  const { awardPointsForAction } = usePoints();
  const { toast } = useToast();

  const handleJoin = async (eventId: string) => {
    if (!user) return;

    try {
      await joinEvent(eventId, user.id);
      await awardPointsForAction('JOIN_EVENT', eventId);
      await refresh();
      
      toast({
        title: "Success",
        description: "You have joined the event"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to join event",
        variant: "destructive"
      });
    }
  };

  const handleLeave = async (eventId: string) => {
    if (!user) return;

    try {
      await leaveEvent(eventId, user.id);
      await refresh();
      
      toast({
        title: "Success",
        description: "You have left the event"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to leave event",
        variant: "destructive"
      });
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) {
    return (
      <EmptyState
        icon={Calendar}
        title="Error loading events"
        description="Please try again later"
      />
    );
  }

  const filteredEvents = filterEvents(events, filters);

  if (filteredEvents.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="No events found"
        description={filters.search ? "Try adjusting your filters" : "No upcoming events"}
      />
    );
  }

  return (
    <EventGrid
      events={filteredEvents}
      userId={user?.id}
      onJoin={handleJoin}
      onLeave={handleLeave}
    />
  );
}