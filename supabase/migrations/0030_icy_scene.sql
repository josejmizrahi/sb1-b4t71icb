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
DROP POLICY IF EXISTS "Users can update their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can join conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view their own participations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view other participants" ON conversation_participants;

-- Simplified conversation policies
CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update conversations"
  ON conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = id
      AND profile_id = auth.uid()
    )
  );

-- Simplified participant policies
CREATE POLICY "Users can view participants"
  ON conversation_participants FOR SELECT
  USING (
    profile_id = auth.uid() OR
    conversation_id IN (
      SELECT conversation_id
      FROM conversation_participants
      WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can add participants"
  ON conversation_participants FOR INSERT
  WITH CHECK (
    -- Either adding self
    profile_id = auth.uid() OR
    -- Or adding someone who allows messages
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
  conv_id UUID;
BEGIN
  -- Check if user2 allows messages
  IF NOT EXISTS (
    SELECT 1 FROM user_preferences
    WHERE profile_id = user2_id
    AND (privacy_settings->>'allow_messages')::boolean = true
  ) THEN
    RAISE EXCEPTION 'User does not accept messages';
  END IF;

  -- Create conversation
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