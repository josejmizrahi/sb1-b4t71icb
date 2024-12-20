import { useState } from 'react';
import { EventHeader } from '@/components/events/EventHeader';
import { EventFilterBar } from '@/components/events/EventFilterBar';
import { EventContent } from '@/components/events/EventContent';
import { useToast } from '@/components/ui/use-toast';

export default function EventsPage() {
  const { toast } = useToast();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [location, setLocation] = useState('all');

  const handleEventCreated = () => {
    setIsSheetOpen(false);
    toast({
      title: "Event created",
      description: "Your event has been created successfully"
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <EventHeader 
        isOpen={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        onEventCreated={handleEventCreated}
      />
      
      <EventFilterBar
        search={search}
        onSearchChange={setSearch}
        type={type}
        onTypeChange={setType}
        location={location}
        onLocationChange={setLocation}
      />

      <EventContent
        filters={{
          search,
          type,
          location
        }}
      />
    </div>
  );
}