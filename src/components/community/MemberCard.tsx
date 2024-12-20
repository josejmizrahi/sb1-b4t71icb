import { User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import type { Profile } from '@/types/profiles';

interface MemberCardProps {
  member: Profile;
  onConnect?: (memberId: string) => void;
  onMessage?: (memberId: string) => void;
}

export function MemberCard({ member, onConnect, onMessage }: MemberCardProps) {
  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-start gap-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={member.avatar_url ?? undefined} />
          <AvatarFallback>
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium truncate">
              {member.display_name || member.username}
            </h3>
            {member.verified && (
              <Badge variant="secondary" className="shrink-0">Verified</Badge>
            )}
          </div>
          
          {member.location && (
            <p className="text-sm text-muted-foreground mt-1">
              {member.location}
            </p>
          )}
        </div>
      </div>

      {member.bio && (
        <p className="text-sm text-muted-foreground line-clamp-2">
          {member.bio}
        </p>
      )}

      {(member.interests?.length > 0 || member.skills?.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {member.interests?.slice(0, 3).map((interest) => (
            <Badge key={interest} variant="outline" className="text-xs">
              {interest}
            </Badge>
          ))}
          {member.skills?.slice(0, 2).map((skill) => (
            <Badge key={skill} variant="outline" className="text-xs">
              {skill}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1"
          onClick={() => onConnect?.(member.id)}
        >
          Connect
        </Button>
        <Button 
          size="sm" 
          className="flex-1"
          onClick={() => onMessage?.(member.id)}
        >
          Message
        </Button>
      </div>
    </Card>
  );
}