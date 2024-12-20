import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import type { Message } from '@/types/messages';

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
  showAvatar?: boolean;
}

export function MessageBubble({ message, isCurrentUser, showAvatar }: MessageBubbleProps) {
  return (
    <div
      className={cn(
        "flex items-end gap-2",
        isCurrentUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {showAvatar && !isCurrentUser && (
        <Avatar className="h-8 w-8">
          <AvatarImage src={message.sender?.avatar_url ?? undefined} />
          <AvatarFallback>
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={cn(
          "relative max-w-[75%] rounded-2xl px-4 py-2",
          isCurrentUser 
            ? "bg-primary text-primary-foreground" 
            : "bg-muted"
        )}
      >
        <p className="text-sm whitespace-pre-wrap break-words pr-12">
          {message.content}
        </p>
        <span className={cn(
          "absolute bottom-2 right-3 text-[10px] leading-none",
          isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground"
        )}>
          {format(new Date(message.created_at), 'p')}
        </span>
      </div>
    </div>
  );
}