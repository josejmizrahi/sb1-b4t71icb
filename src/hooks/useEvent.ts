import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { getEvent } from '@/lib/api/events';
import type { EventWithAttendees } from '@/types/events';

export function useEvent(id: string | undefined) {
  const { toast } = useToast();
  const [event, setEvent] = useState<EventWithAttendees>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    loadEvent();
  }, [id]);

  async function loadEvent() {
    try {
      const data = await getEvent(id!);
      setEvent(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load event details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  return { event, loading, refresh: loadEvent };
}