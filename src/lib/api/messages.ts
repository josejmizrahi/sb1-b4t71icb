import { supabase } from '../supabase';
import type { Message, ConversationWithParticipants } from '@/types/messages';

export async function getConversations(userId: string) {
  const { data: conversations, error } = await supabase
    .from('conversations')
    .select(`
      *,
      participants:conversation_participants(
        profile:profiles(
          id,
          display_name,
          avatar_url
        )
      )
    `)
    .order('updated_at', { ascending: false });

  if (error) throw error;

  // Calculate unread messages for each conversation
  const conversationsWithUnread = await Promise.all(
    conversations.map(async (conversation) => {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversation.id)
        .eq('is_read', false)
        .neq('sender_id', userId);

      return {
        ...conversation,
        unread_count: count || 0
      };
    })
  );

  return conversationsWithUnread as ConversationWithParticipants[];
}

export async function getOrCreateConversation(userId: string, otherUserId: string) {
  const { data, error } = await supabase
    .rpc('get_or_create_conversation', {
      user1_id: userId,
      user2_id: otherUserId
    });

  if (error) throw error;
  return data;
}

export async function getMessages(conversationId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:profiles(
        id,
        display_name,
        avatar_url
      )
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as Message[];
}

export async function sendMessage(conversationId: string, senderId: string, content: string) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function markMessagesAsRead(conversationId: string, userId: string) {
  const { error } = await supabase
    .rpc('mark_messages_as_read', {
      _conversation_id: conversationId,
      _user_id: userId
    });

  if (error) throw error;
}