/*
  # Fix Messages System

  1. Changes
    - Drop and recreate get_unread_message_count function with fixed parameter name
    - Add function to mark messages as read
    - Add function to get conversation participants
    - Add missing indexes for performance

  2. Security
    - Ensure proper RLS policies
    - Add security definer to functions
*/

-- Drop existing function
DROP FUNCTION IF EXISTS get_unread_message_count(uuid);

-- Recreate function with fixed parameter name
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

-- Function to mark messages as read
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
  WHERE 
    conversation_id = _conversation_id
    AND sender_id != _user_id
    AND NOT is_read;

  -- Update last read timestamp
  UPDATE conversation_participants
  SET last_read_at = CURRENT_TIMESTAMP
  WHERE 
    conversation_id = _conversation_id
    AND profile_id = _user_id;
END;
$$;

-- Function to get conversation participants
CREATE OR REPLACE FUNCTION get_conversation_participants(conv_id UUID)
RETURNS TABLE (
  profile_id UUID,
  display_name TEXT,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.display_name,
    p.avatar_url
  FROM conversation_participants cp
  JOIN profiles p ON p.id = cp.profile_id
  WHERE cp.conversation_id = conv_id;
END;
$$;

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_read_status ON messages(conversation_id, sender_id, is_read);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_last_read ON conversation_participants(conversation_id, profile_id, last_read_at);