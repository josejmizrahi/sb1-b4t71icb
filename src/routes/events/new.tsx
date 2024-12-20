import { Container } from '@/components/layout/Container';
import { PageHeader } from '@/components/ui/page-header';
import { EventForm } from '@/components/events/EventForm';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

export default function NewEventPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSuccess = () => {
    toast({
      title: "Event created",
      description: "Your event has been created successfully"
    });
    navigate('/events');
  };

  return (
    <Container size="sm" className="py-6">
      <PageHeader 
        title="Create Event" 
        description="Host a new event for the community"
      />
      <div className="mt-6">
        <EventForm onSuccess={handleSuccess} />
      </div>
    </Container>
  );
}