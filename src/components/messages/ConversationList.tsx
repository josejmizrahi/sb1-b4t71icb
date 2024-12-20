import { User } from 'lucide-react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { LoadingSpinner } from '../ui/loading-spinner';
import { EmptyState } from '../ui/empty-state';
import { useAuth } from '@/lib/auth/AuthContext';
import { cn } from '@/lib/utils';
import type { ConversationWithParticipants } from '@/types/messages';

interface ConversationListProps {
  conversations: ConversationWithParticipants[];
  selectedId?: string;
  onSelect: (id: string) => void;
  loading?: boolean;
}

export function ConversationList({ 
  conversations, 
  selectedId,
  onSelect,
  loading 
}: ConversationListProps) {
  const { user } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!conversations.length) {
    return (
      <EmptyState
        icon={User}
        title="No conversations"
        description="Start a new conversation with someone"
      />
    );
  }

  return (
    <div className="flex-1 overflow-y-auto divide-y divide-border">
      {conversations.map((conversation) => {
        const otherParticipant = conversation.participants.find(
          p => p.profile_id !== user?.id
        )?.profile;

        if (!otherParticipant) return null;

        return (
          <button
            key={conversation.id}
            onClick={() => onSelect(conversation.id)}
            className={cn(
              "w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors",
              selectedId === conversation.id && "bg-muted"
            )}
          >
            <Avatar>
              <AvatarImage src={otherParticipant.avatar_url ?? undefined} />
              <AvatarFallback>
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center justify-between">
                <p className="font-medium truncate">
                  {otherParticipant.display_name || 'User'}
                </p>
                {conversation.last_message_at && (
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(conversation.last_message_at), 'p')}
                  </span>
                )}
              </div>
              
              <div className="flex items-center justify-between mt-1">
                <p className="text-sm text-muted-foreground truncate">
                  {conversation.last_message}
                </p>
                {conversation.unread_count > 0 && (
                  <Badge variant="default" className="ml-2">
                    {conversation.unread_count}
                  </Badge>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}