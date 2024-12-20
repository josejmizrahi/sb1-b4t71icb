import { Container } from '@/components/layout/Container';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

export default function ProfileSettingsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSuccess = () => {
    toast({
      title: "Profile updated",
      description: "Your profile has been updated successfully"
    });
    navigate('/profile');
  };

  return (
    <Container className="py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Edit Profile</h1>
        <ProfileForm onSuccess={handleSuccess} />
      </div>
    </Container>
  );
}