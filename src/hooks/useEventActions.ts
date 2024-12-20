import { useAuth } from '@/lib/auth/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { joinEvent, leaveEvent } from '@/lib/api/events';

export function useEventActions(onSuccess?: () => void) {
  const { user } = useAuth();
  const { toast } = useToast();

  const handleJoin = async (eventId: string) => {
    if (!user) return;
    try {
      await joinEvent(eventId, user.id);
      onSuccess?.();
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
      onSuccess?.();
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

  return { handleJoin, handleLeave };
}