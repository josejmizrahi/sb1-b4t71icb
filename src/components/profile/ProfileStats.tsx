import { Trophy, Calendar, BookOpen } from 'lucide-react';
import type { Profile } from '@/types/profiles';

interface ProfileStatsProps {
  profile: Profile;
  stats: {
    eventsAttended: number;
    studyGroupsJoined: number;
  };
}

export function ProfileStats({ profile, stats }: ProfileStatsProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-card p-4 rounded-lg">
        <div className="flex items-center space-x-2">
          <Trophy className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Points</span>
        </div>
        <p className="mt-2 text-2xl font-bold">{profile.total_points}</p>
      </div>

      <div className="bg-card p-4 rounded-lg">
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Events</span>
        </div>
        <p className="mt-2 text-2xl font-bold">{stats.eventsAttended}</p>
      </div>

      <div className="bg-card p-4 rounded-lg">
        <div className="flex items-center space-x-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Study Groups</span>
        </div>
        <p className="mt-2 text-2xl font-bold">{stats.studyGroupsJoined}</p>
      </div>
    </div>
  );
}