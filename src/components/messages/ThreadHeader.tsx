import { User, ArrowLeft } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import type { ConversationWithParticipants } from '@/types/messages';
import { useAuth } from '@/lib/auth/AuthContext';

interface ThreadHeaderProps {
  conversation: ConversationWithParticipants;
  onBack?: () => void;
}

export function ThreadHeader({ conversation, onBack }: ThreadHeaderProps) {
  const { user } = useAuth();
  const otherParticipant = conversation.participants.find(
    p => p.profile_id !== user?.id
  )?.profile;

  if (!otherParticipant) return null;

  return (
    <div className="flex items-center gap-3 border-b p-4 bg-background">
      {onBack && (
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      )}
      
      <Avatar>
        <AvatarImage src={otherParticipant.avatar_url ?? undefined} />
        <AvatarFallback>
          <User className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <h3 className="font-medium truncate">
          {otherParticipant.display_name || 'User'}
        </h3>
        <p className="text-sm text-muted-foreground truncate">
          {otherParticipant.status === 'online' ? 'Online' : 'Offline'}
        </p>
      </div>
    </div>
  );
}