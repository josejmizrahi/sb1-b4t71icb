import { Container } from '@/components/layout/Container';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileStats } from '@/components/profile/ProfileStats';
import { ProfileTags } from '@/components/profile/ProfileTags';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function ProfilePage() {
  const { user } = useAuth();
  const { profile, loading } = useProfile(user?.id);

  if (loading) return <LoadingSpinner />;
  if (!profile) return null;

  return (
    <Container className="py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Profile</h1>
        <Button variant="outline" asChild>
          <Link to="/profile/settings">
            <Settings className="h-4 w-4 mr-2" />
            Edit Profile
          </Link>
        </Button>
      </div>

      <div className="space-y-8">
        <ProfileHeader profile={profile} />
        
        <ProfileStats 
          profile={profile}
          stats={{
            eventsAttended: 0,
            studyGroupsJoined: 0
          }}
        />

        <div className="grid gap-6">
          <ProfileTags title="Interests" tags={profile.interests || []} />
          <ProfileTags title="Skills" tags={profile.skills || []} />
        </div>
      </div>
    </Container>
  );
}