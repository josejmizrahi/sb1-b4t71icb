import { useState, useEffect } from 'react';
import { getEvents } from '@/lib/api/events';
import type { EventWithAttendees } from '@/types/events';
import { useToast } from '@/components/ui/use-toast';

export function useEvents() {
  const { toast } = useToast();
  const [events, setEvents] = useState<EventWithAttendees[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    try {
      const data = await getEvents();
      setEvents(data);
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load events');
      setError(error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  return {
    events,
    loading,
    error,
    refresh: loadEvents
  };
}