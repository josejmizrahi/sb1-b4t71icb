export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  points: number;
  requirements: {
    type: 'points' | 'events' | 'study_groups';
    threshold: number;
  };
}

export interface UserAchievement {
  profile_id: string;
  achievement_id: string;
  unlocked_at: string;
  progress: number;
}

export interface AchievementWithProgress extends Achievement {
  progress: number;
  isUnlocked: boolean;
  unlockedAt?: string;
}