import { User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import type { Profile } from '@/types/profiles';

interface MemberListProps {
  members: Profile[];
  onSelect: (memberId: string) => void;
  loading?: boolean;
}

export function MemberList({ members, onSelect, loading }: MemberListProps) {
  return (
    <div className="space-y-2">
      {members.map((member) => (
        <Button
          key={member.id}
          variant="ghost"
          className="w-full justify-start px-2 py-6"
          onClick={() => onSelect(member.id)}
          disabled={loading}
        >
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={member.avatar_url ?? undefined} />
              <AvatarFallback>
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="text-left">
              <p className="font-medium">{member.display_name || member.username}</p>
              {member.bio && (
                <p className="text-sm text-muted-foreground line-clamp-1">{member.bio}</p>
              )}
            </div>
          </div>
        </Button>
      ))}
    </div>
  );
}