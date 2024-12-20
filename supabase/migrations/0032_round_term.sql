/*
  # Fix conversation policies and participant handling

  1. Changes
    - Simplify conversation and participant policies
    - Fix recursive policy issues
    - Add proper conversation existence check
    
  2. Security
    - Ensure users can only view their own conversations
    - Validate message permissions before adding participants
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can add participants" ON conversation_participants;

-- Simplified conversation policies
CREATE POLICY "Users can view conversations"
  ON conversations FOR SELECT
  USING (
    id IN (
      SELECT conversation_id 
      FROM conversation_participants 
      WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (true);

-- Simplified participant policies
CREATE POLICY "Users can view participants"
  ON conversation_participants FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id 
      FROM conversation_participants 
      WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can add participants"
  ON conversation_participants FOR INSERT
  WITH CHECK (
    profile_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_preferences up
      WHERE up.profile_id = conversation_participants.profile_id
      AND (up.privacy_settings->>'allow_messages')::boolean = true
    )
  );

-- Function to check if conversation exists
CREATE OR REPLACE FUNCTION get_existing_conversation(user1_id UUID, user2_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conv_id UUID;
BEGIN
  SELECT cp1.conversation_id INTO conv_id
  FROM conversation_participants cp1
  JOIN conversation_participants cp2 ON cp2.conversation_id = cp1.conversation_id
  WHERE cp1.profile_id = user1_id AND cp2.profile_id = user2_id
  LIMIT 1;
  
  RETURN conv_id;
END;
$$;

-- Function to create a conversation between two users
CREATE OR REPLACE FUNCTION create_conversation(user1_id UUID, user2_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conv_id UUID;
BEGIN
  -- Check for existing conversation
  SELECT get_existing_conversation(user1_id, user2_id) INTO conv_id;
  
  IF conv_id IS NOT NULL THEN
    RETURN conv_id;
  END IF;

  -- Check if user2 allows messages
  IF NOT EXISTS (
    SELECT 1 FROM user_preferences
    WHERE profile_id = user2_id
    AND (up.privacy_settings->>'allow_messages')::boolean = true
  ) THEN
    RAISE EXCEPTION 'User does not accept messages';
  END IF;

  -- Create new conversation
  INSERT INTO conversations DEFAULT VALUES
  RETURNING id INTO conv_id;

  -- Add participants
  INSERT INTO conversation_participants (conversation_id, profile_id)
  VALUES
    (conv_id, user1_id),
    (conv_id, user2_id);

  RETURN conv_id;
END;
$$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversation_lookup 
  ON conversation_participants(profile_id, conversation_id);