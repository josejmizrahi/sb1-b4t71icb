import { Container } from '@/components/layout/Container';
import { PageHeader } from '@/components/ui/page-header';
import { FundraisingForm } from '@/components/fundraising/FundraisingForm';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

export default function NewFundraisingPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSuccess = () => {
    toast({
      title: "Campaign created",
      description: "Your fundraising campaign has been created successfully"
    });
    navigate('/fundraising');
  };

  return (
    <Container size="sm" className="py-6">
      <PageHeader 
        title="Create Fundraising Campaign" 
        description="Start a new fundraising campaign for the community"
      />
      <div className="mt-6">
        <FundraisingForm onSuccess={handleSuccess} />
      </div>
    </Container>
  );
}