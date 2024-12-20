/*
  # Fix Messaging System

  1. Changes
    - Fix infinite recursion in conversation participants policy
    - Add better message handling
    - Optimize queries with indexes

  2. Security
    - Ensure users can only access their own conversations
    - Prevent unauthorized message access
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view conversation messages" ON messages;

-- Create new, optimized policies
CREATE POLICY "Users can view conversation participants"
  ON conversation_participants FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND profile_id = auth.uid()
    )
  );

-- Add function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_as_read(
  _conversation_id UUID,
  _user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update message read status
  UPDATE messages
  SET is_read = true
  WHERE conversation_id = _conversation_id
  AND sender_id != _user_id
  AND NOT is_read;

  -- Update last read timestamp
  UPDATE conversation_participants
  SET last_read_at = CURRENT_TIMESTAMP
  WHERE conversation_id = _conversation_id
  AND profile_id = _user_id;
END;
$$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_read_status 
  ON messages(conversation_id, sender_id, is_read)
  WHERE NOT is_read;

CREATE INDEX IF NOT EXISTS idx_conversation_participants_lookup 
  ON conversation_participants(profile_id, conversation_id);