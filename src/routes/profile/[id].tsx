import { useParams } from 'react-router-dom';
import { Container } from '@/components/layout/Container';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileStats } from '@/components/profile/ProfileStats';
import { ProfileTags } from '@/components/profile/ProfileTags';
import { useProfile } from '@/hooks/useProfile';

export default function ProfileViewPage() {
  const { id } = useParams();
  const { profile, loading, error } = useProfile(id);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!profile) return <div>Profile not found</div>;

  return (
    <Container className="py-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <ProfileHeader profile={profile} />
        
        <ProfileStats 
          profile={profile}
          stats={{
            eventsAttended: 0, // TODO: Fetch from API
            studyGroupsJoined: 0 // TODO: Fetch from API
          }}
        />

        <div className="grid gap-6">
          <ProfileTags title="Interests" tags={profile.interests} />
          <ProfileTags title="Skills" tags={profile.skills} />
        </div>
      </div>
    </Container>
  );
}