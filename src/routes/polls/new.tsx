import { Container } from '@/components/layout/Container';
import { PageHeader } from '@/components/ui/page-header';
import { PollForm } from '@/components/polls/PollForm';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

export default function NewPollPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSuccess = () => {
    toast({
      title: "Poll created",
      description: "Your poll has been created successfully"
    });
    navigate('/polls');
  };

  return (
    <Container size="sm" className="py-6">
      <PageHeader 
        title="Create Poll" 
        description="Create a new poll to gather community feedback"
      />
      <div className="mt-6">
        <PollForm onSuccess={handleSuccess} />
      </div>
    </Container>
  );
}