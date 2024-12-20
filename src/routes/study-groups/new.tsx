import { Container } from '@/components/layout/Container';
import { PageHeader } from '@/components/ui/page-header';
import { StudyGroupForm } from '@/components/study-groups/StudyGroupForm';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

export default function NewStudyGroupPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSuccess = () => {
    toast({
      title: "Study group created",
      description: "Your study group has been created successfully"
    });
    navigate('/study-groups');
  };

  return (
    <Container size="sm" className="py-6">
      <PageHeader 
        title="Create Study Group" 
        description="Start a new study group with the community"
      />
      <div className="mt-6">
        <StudyGroupForm onSuccess={handleSuccess} />
      </div>
    </Container>
  );
}