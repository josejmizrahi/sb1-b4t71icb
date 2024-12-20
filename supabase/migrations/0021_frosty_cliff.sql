/*
  # Messages System Overhaul

  1. Tables
    - conversations: Stores chat conversations
    - conversation_participants: Tracks participants in each conversation
    - messages: Stores individual messages

  2. Security
    - Enable RLS on all tables
    - Add policies for conversation access
    - Add policies for message access

  3. Functions
    - Update conversation last message
    - Get unread message count
*/

-- Drop existing tables if they exist
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversation_participants CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS get_unread_message_count(uuid);
DROP FUNCTION IF EXISTS update_conversation_last_message();

-- Create conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  last_message TEXT,
  last_message_at TIMESTAMPTZ
);

-- Create conversation participants table
CREATE TABLE conversation_participants (
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  last_read_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (conversation_id, profile_id)
);

-- Create messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  is_read BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Conversations policies
CREATE POLICY "Users can view their conversations"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = id
      AND profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (true);

-- Conversation participants policies
CREATE POLICY "Users can view conversation participants"
  ON conversation_participants FOR SELECT
  USING (
    profile_id = auth.uid() OR
    conversation_id IN (
      SELECT conversation_id
      FROM conversation_participants
      WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can join conversations"
  ON conversation_participants FOR INSERT
  WITH CHECK (
    profile_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_preferences
      WHERE profile_id = profile_id
      AND privacy_settings->>'allow_messages' = 'true'
    )
  );

-- Messages policies
CREATE POLICY "Users can view conversation messages"
  ON messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id
      FROM conversation_participants
      WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    conversation_id IN (
      SELECT conversation_id
      FROM conversation_participants
      WHERE profile_id = auth.uid()
    )
  );

-- Function to update conversation last message
CREATE FUNCTION update_conversation_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE conversations
  SET 
    last_message = NEW.content,
    last_message_at = NEW.created_at,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

-- Create trigger for updating last message
CREATE TRIGGER on_message_sent
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- Function to get unread message count
CREATE FUNCTION get_unread_message_count(user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO count
  FROM messages m
  JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
  WHERE 
    cp.profile_id = user_id
    AND m.sender_id != user_id
    AND NOT m.is_read;
  
  RETURN count;
END;
$$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(conversation_id, is_read) WHERE NOT is_read;
CREATE INDEX IF NOT EXISTS idx_conversation_participants_profile ON conversation_participants(profile_id);