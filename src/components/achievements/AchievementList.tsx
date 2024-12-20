import { useEffect, useState } from 'react';
import { getUserAchievements } from '@/lib/api/achievements';
import { AchievementCard } from './AchievementCard';
import { useAuth } from '@/lib/auth/AuthContext';
import type { AchievementWithProgress } from '@/types/achievements';

export function AchievementList() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<AchievementWithProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function loadAchievements() {
      try {
        const data = await getUserAchievements(user.id);
        setAchievements(data);
      } catch (error) {
        console.error('Failed to load achievements:', error);
      } finally {
        setLoading(false);
      }
    }

    loadAchievements();
  }, [user]);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {achievements.map((achievement) => (
        <AchievementCard
          key={achievement.id}
          achievement={achievement}
        />
      ))}
    </div>
  );
}