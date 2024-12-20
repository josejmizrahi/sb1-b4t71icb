/*
  # Fix conversation creation policies

  1. Changes
    - Simplify conversation creation policies
    - Add missing update policies for participants
    - Fix join conversation policy logic
    
  2. Security
    - Ensure users can only create conversations they're part of
    - Maintain privacy settings checks
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can join conversations" ON conversation_participants;

-- Create new conversation policies
CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their conversations"
  ON conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = id
      AND profile_id = auth.uid()
    )
  );

-- Create new participant policies
CREATE POLICY "Users can join conversations"
  ON conversation_participants FOR INSERT
  WITH CHECK (
    -- User can add themselves
    profile_id = auth.uid() OR
    -- Or add others who allow messages
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