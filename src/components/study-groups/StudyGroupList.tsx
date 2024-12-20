import { useEffect, useState } from 'react';
import { getStudyGroups, joinStudyGroup, leaveStudyGroup } from '@/lib/api/studyGroups';
import { StudyGroupCard } from './StudyGroupCard';
import { useAuth } from '@/lib/auth/AuthContext';
import { usePoints } from '@/hooks/usePoints';
import type { StudyGroup } from '@/types/studyGroups';

export function StudyGroupList() {
  const { user } = useAuth();
  const { awardPointsForAction } = usePoints();
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGroups();
  }, []);

  async function loadGroups() {
    try {
      const data = await getStudyGroups();
      setGroups(data);
    } catch (error) {
      console.error('Failed to load study groups:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleJoin = async (groupId: string) => {
    if (!user) return;

    try {
      await joinStudyGroup(groupId, user.id);
      await awardPointsForAction('JOIN_STUDY_GROUP', groupId);
      await loadGroups();
    } catch (error) {
      console.error('Failed to join study group:', error);
    }
  };

  const handleLeave = async (groupId: string) => {
    if (!user) return;

    try {
      await leaveStudyGroup(groupId, user.id);
      await loadGroups();
    } catch (error) {
      console.error('Failed to leave study group:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {groups.map((group) => (
        <StudyGroupCard
          key={group.id}
          group={group}
          onJoin={handleJoin}
          onLeave={handleLeave}
          isMember={group.members?.some(m => m.profile_id === user?.id)}
        />
      ))}
    </div>
  );
}