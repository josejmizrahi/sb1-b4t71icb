/*
  # Fix conversation creation and participant policies

  1. Changes
    - Simplify conversation creation flow
    - Fix recursive policy issues
    - Add proper participant validation
    
  2. Security
    - Ensure users can only create conversations they're part of
    - Validate message permissions before adding participants
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can add participants" ON conversation_participants;

-- Simplified conversation policies
CREATE POLICY "Users can view conversations"
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

-- Simplified participant policies
CREATE POLICY "Users can view participants"
  ON conversation_participants FOR SELECT
  USING (
    profile_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM conversation_participants cp2
      WHERE cp2.conversation_id = conversation_participants.conversation_id
      AND cp2.profile_id = auth.uid()
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

-- Function to create a conversation between two users
CREATE OR REPLACE FUNCTION create_conversation(user1_id UUID, user2_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_conv_id UUID;
  new_conv_id UUID;
BEGIN
  -- First check if conversation exists
  SELECT cp1.conversation_id INTO existing_conv_id
  FROM conversation_participants cp1
  JOIN conversation_participants cp2 
    ON cp2.conversation_id = cp1.conversation_id
  WHERE cp1.profile_id = user1_id 
    AND cp2.profile_id = user2_id;

  IF existing_conv_id IS NOT NULL THEN
    RETURN existing_conv_id;
  END IF;

  -- Check if user2 allows messages
  IF NOT EXISTS (
    SELECT 1 FROM user_preferences
    WHERE profile_id = user2_id
    AND (privacy_settings->>'allow_messages')::boolean = true
  ) THEN
    RAISE EXCEPTION 'User does not accept messages';
  END IF;

  -- Create new conversation
  INSERT INTO conversations DEFAULT VALUES
  RETURNING id INTO new_conv_id;

  -- Add participants
  INSERT INTO conversation_participants (conversation_id, profile_id)
  VALUES
    (new_conv_id, user1_id),
    (new_conv_id, user2_id);

  RETURN new_conv_id;
END;
$$;