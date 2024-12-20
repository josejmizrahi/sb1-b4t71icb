/*
  # Messaging System Fixes and Optimizations

  1. Changes
    - Fix infinite recursion in conversation participants policy
    - Optimize message queries
    - Add missing indexes
    - Add functions for unread message counts

  2. Security
    - Simplified RLS policies to prevent recursion
    - Maintain proper access control
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;

-- Create new, simplified policies
CREATE POLICY "Users can view their own participations"
  ON conversation_participants FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id 
      FROM conversation_participants 
      WHERE profile_id = auth.uid()
    )
  );

-- Function to get unread message count
CREATE OR REPLACE FUNCTION get_unread_message_count(_user_id UUID)
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
    cp.profile_id = _user_id
    AND m.sender_id != _user_id
    AND NOT m.is_read;
  
  RETURN count;
END;
$$;

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_unread 
  ON messages(conversation_id, sender_id, is_read)
  WHERE NOT is_read;

CREATE INDEX IF NOT EXISTS idx_conversation_participants_user 
  ON conversation_participants(profile_id, conversation_id);