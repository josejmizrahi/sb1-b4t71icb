import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { MessageBubble } from './MessageBubble';
import type { Message } from '@/types/messages';

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  const { user } = useAuth();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="space-y-3">
      {messages.map((message, index) => {
        const isCurrentUser = message.sender_id === user?.id;
        const showAvatar = index === 0 || 
          messages[index - 1].sender_id !== message.sender_id;

        return (
          <MessageBubble
            key={message.id}
            message={message}
            isCurrentUser={isCurrentUser}
            showAvatar={showAvatar}
          />
        );
      })}
      <div ref={endRef} />
    </div>
  );
}