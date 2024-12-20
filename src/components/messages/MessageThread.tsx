import { useEffect, useRef } from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { ThreadHeader } from './ThreadHeader';
import { MessageSquare } from 'lucide-react';
import { EmptyState } from '../ui/empty-state';
import type { Message, ConversationWithParticipants } from '@/types/messages';

interface MessageThreadProps {
  conversation?: ConversationWithParticipants;
  messages: Message[];
  onSend: (content: string) => void;
  onRead: () => void;
  onBack: () => void;
  error?: Error | null;
}

export function MessageThread({ 
  conversation,
  messages,
  onSend,
  onRead,
  onBack,
  error
}: MessageThreadProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (conversation) {
      onRead();
    }
  }, [conversation?.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!conversation) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <EmptyState
          icon={MessageSquare}
          title="No conversation selected"
          description="Choose a conversation to start messaging"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <EmptyState
          icon={MessageSquare}
          title="Error loading messages"
          description="Please try again later"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ThreadHeader conversation={conversation} onBack={onBack} />
      
      <div className="flex-1 overflow-y-auto p-4">
        <MessageList messages={messages} />
        <div ref={endRef} />
      </div>

      <div className="p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t">
        <MessageInput onSend={onSend} />
      </div>
    </div>
  );
}