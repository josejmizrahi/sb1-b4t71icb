import { LucideIcon } from 'lucide-react';
import * as icons from 'lucide-react';
import { Progress } from '../ui/progress';
import { format } from 'date-fns';
import type { AchievementWithProgress } from '@/types/achievements';

interface AchievementCardProps {
  achievement: AchievementWithProgress;
}

export function AchievementCard({ achievement }: AchievementCardProps) {
  const Icon = icons[achievement.icon as keyof typeof icons] as LucideIcon;

  return (
    <div className="bg-card p-6 rounded-lg space-y-4">
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-full ${
          achievement.isUnlocked ? 'bg-primary/20' : 'bg-muted'
        }`}>
          <Icon className={`h-6 w-6 ${
            achievement.isUnlocked ? 'text-primary' : 'text-muted-foreground'
          }`} />
        </div>
        <div className="flex-1">
          <h3 className="font-medium">{achievement.title}</h3>
          <p className="text-sm text-muted-foreground">
            {achievement.description}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">
            {Math.round(achievement.progress)}%
          </span>
        </div>
        <Progress value={achievement.progress} />
      </div>

      {achievement.isUnlocked && (
        <div className="pt-2 text-sm text-primary">
          Unlocked {format(new Date(achievement.unlockedAt!), 'PP')}
        </div>
      )}
    </div>
  );
}