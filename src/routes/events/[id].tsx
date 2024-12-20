import { useParams } from 'react-router-dom';
import { Container } from '@/components/layout/Container';
import { EventDetailHeader } from '@/components/events/EventDetailHeader';
import { EventDetailContent } from '@/components/events/EventDetailContent';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/auth/AuthContext';
import { useEvent } from '@/hooks/useEvent';
import { useEventActions } from '@/hooks/useEventActions';

export default function EventDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const { event, loading, refresh } = useEvent(id);
  const { handleJoin, handleLeave } = useEventActions(refresh);

  if (loading) return <LoadingSpinner />;
  if (!event) return <div>Event not found</div>;

  const isAttending = event.attendees?.some(
    a => a.profile?.id === user?.id && a.status === 'attending'
  );

  const handleShare = async () => {
    try {
      await navigator.share({
        title: event.title,
        text: event.description,
        url: window.location.href
      });
    } catch {
      // Fallback to copying link
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied",
        description: "Event link copied to clipboard"
      });
    }
  };

  return (
    <Container className="py-8">
      <EventDetailHeader
        event={event}
        isAttending={isAttending}
        onJoin={() => handleJoin(event.id)}
        onLeave={() => handleLeave(event.id)}
        onShare={handleShare}
      />
      <EventDetailContent event={event} />
    </Container>
  );
}