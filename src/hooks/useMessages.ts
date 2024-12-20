import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  getConversations,
  getMessages,
  sendMessage as sendMessageApi,
  markMessagesAsRead
} from '@/lib/api/messages';
import { useToast } from '@/components/ui/use-toast';
import type { Message, ConversationWithParticipants } from '@/types/messages';

export function useMessages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<ConversationWithParticipants[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithParticipants>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) return;
    loadConversations();

    // Subscribe to new messages
    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMessage = payload.new as Message;
            
            if (newMessage.conversation_id === selectedConversation?.id) {
              setMessages(prev => [...prev, newMessage]);
              if (newMessage.sender_id !== user.id) {
                await markMessagesAsRead(newMessage.conversation_id, user.id);
              }
            }

            await loadConversations();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedConversation?.id]);

  async function loadConversations() {
    if (!user) return;
    try {
      const data = await getConversations(user.id);
      setConversations(data);
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load conversations');
      setError(error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(conversationId: string) {
    if (!user) return;
    try {
      const data = await getMessages(conversationId);
      setMessages(data);
      await markMessagesAsRead(conversationId, user.id);
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load messages');
      setError(error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  }

  const selectConversation = async (conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      setSelectedConversation(conversation);
      await loadMessages(conversationId);
    }
  };

  const sendMessage = async (content: string) => {
    if (!user || !selectedConversation) return;

    try {
      await sendMessageApi(selectedConversation.id, user.id, content);
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to send message');
      setError(error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const markAsRead = async () => {
    if (!user || !selectedConversation) return;
    await markMessagesAsRead(selectedConversation.id, user.id);
  };

  return {
    conversations,
    selectedConversation,
    messages,
    loading,
    error,
    selectConversation,
    sendMessage,
    markAsRead,
    refresh: loadConversations
  };
}