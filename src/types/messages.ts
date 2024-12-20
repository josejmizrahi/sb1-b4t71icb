export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  last_message: string | null;
  last_message_at: string | null;
  participants: ConversationParticipant[];
}

export interface ConversationParticipant {
  conversation_id: string;
  profile_id: string;
  profile: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  joined_at: string;
  last_read_at: string;
}

export interface ConversationWithParticipants extends Conversation {
  participants: ConversationParticipant[];
  unread_count: number;
}