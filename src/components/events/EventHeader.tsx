import { Plus } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../ui/sheet';
import { EventForm } from './EventForm';
import { Container } from '../layout/Container';

interface EventHeaderProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onEventCreated: () => void;
}

export function EventHeader({ isOpen, onOpenChange, onEventCreated }: EventHeaderProps) {
  return (
    <div className="bg-white border-b">
      <Container>
        <div className="h-16 flex items-center justify-between">
          <h1 className="text-lg font-medium">Events</h1>
          <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Event
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-lg">
              <SheetHeader>
                <SheetTitle>Create New Event</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <EventForm onSuccess={onEventCreated} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </Container>
    </div>
  );
}