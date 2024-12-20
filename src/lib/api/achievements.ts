import { supabase } from '../supabase';
import { ACHIEVEMENTS } from '../constants/achievements';
import type { UserAchievement, AchievementWithProgress } from '@/types/achievements';

export async function getUserAchievements(userId: string) {
  const { data: userAchievements, error } = await supabase
    .from('user_achievements')
    .select('*')
    .eq('profile_id', userId);

  if (error) throw error;

  const { data: stats } = await supabase
    .rpc('get_user_stats', { user_id: userId });

  return ACHIEVEMENTS.map(achievement => {
    const userAchievement = userAchievements?.find(
      ua => ua.achievement_id === achievement.id
    );

    let progress = 0;
    switch (achievement.requirements.type) {
      case 'points':
        progress = (stats?.total_points || 0) / achievement.requirements.threshold * 100;
        break;
      case 'events':
        progress = (stats?.events_attended || 0) / achievement.requirements.threshold * 100;
        break;
      case 'study_groups':
        progress = (stats?.study_groups_joined || 0) / achievement.requirements.threshold * 100;
        break;
    }

    return {
      ...achievement,
      progress: Math.min(progress, 100),
      isUnlocked: !!userAchievement,
      unlockedAt: userAchievement?.unlocked_at
    };
  });
}

export async function checkAndUnlockAchievements(userId: string) {
  const achievements = await getUserAchievements(userId);
  
  for (const achievement of achievements) {
    if (!achievement.isUnlocked && achievement.progress >= 100) {
      await supabase.from('user_achievements').insert({
        profile_id: userId,
        achievement_id: achievement.id,
        progress: 100
      });

      await supabase.rpc('award_points', {
        user_id: userId,
        action: `achievement_${achievement.id}`,
        points: achievement.points
      });
    }
  }
}