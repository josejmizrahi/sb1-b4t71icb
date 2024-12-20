import { User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import type { Profile } from '@/types/profiles';

interface ProfileHeaderProps {
  profile: Profile;
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
  return (
    <div className="flex items-start space-x-4">
      <Avatar className="h-20 w-20">
        <AvatarImage src={profile.avatar_url ?? undefined} />
        <AvatarFallback>
          <User className="h-8 w-8" />
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1">
        <div className="flex items-center space-x-2">
          <h2 className="text-2xl font-bold">
            {profile.display_name || profile.username}
          </h2>
          {profile.verified && (
            <Badge variant="success">Verified</Badge>
          )}
        </div>
        
        {profile.bio && (
          <p className="mt-2 text-muted-foreground">{profile.bio}</p>
        )}
        
        <div className="mt-2 flex items-center text-sm text-muted-foreground">
          {profile.location && (
            <span className="mr-4">{profile.location}</span>
          )}
          <span>Joined {new Date(profile.join_date).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}