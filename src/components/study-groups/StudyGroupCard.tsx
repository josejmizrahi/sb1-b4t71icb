import { Calendar, Users } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import type { StudyGroup } from '@/types/studyGroups';

interface StudyGroupCardProps {
  group: StudyGroup;
  onJoin?: (groupId: string) => void;
  onLeave?: (groupId: string) => void;
  isMember?: boolean;
}

export function StudyGroupCard({ 
  group, 
  onJoin, 
  onLeave,
  isMember 
}: StudyGroupCardProps) {
  return (
    <div className="bg-card p-6 rounded-lg space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-medium">{group.title}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {group.description}
          </p>
        </div>
        <Badge>{group.level}</Badge>
      </div>

      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
        <div className="flex items-center">
          <Calendar className="h-4 w-4 mr-1" />
          {group.schedule.frequency}
        </div>
        <div className="flex items-center">
          <Users className="h-4 w-4 mr-1" />
          {group.max_members ? `${group.members?.length || 0}/${group.max_members}` : 'Unlimited'}
        </div>
      </div>

      <div className="pt-4 border-t">
        {isMember ? (
          <Button 
            variant="outline" 
            onClick={() => onLeave?.(group.id)}
            className="w-full"
          >
            Leave Group
          </Button>
        ) : (
          <Button 
            onClick={() => onJoin?.(group.id)}
            className="w-full"
          >
            Join Group
          </Button>
        )}
      </div>
    </div>
  );
}