import { User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

interface CampaignCreatorProps {
  name: string;
  avatarUrl?: string | null;
  className?: string;
}

export function CampaignCreator({ name, avatarUrl, className }: CampaignCreatorProps) {
  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-8 w-8">
        <AvatarImage src={avatarUrl ?? undefined} />
        <AvatarFallback>
          <User className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      <span className="text-sm text-muted-foreground">
        by {name}
      </span>
    </div>
  );
}