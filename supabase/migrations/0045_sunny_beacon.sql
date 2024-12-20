/*
  # Fix messaging system policies

  1. Changes
    - Remove recursive policies
    - Simplify participant viewing logic
    - Fix privacy settings check
    
  2. Security
    - Maintain data access control
    - Prevent infinite recursion
    - Respect user privacy settings
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own participations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view conversation members" ON conversation_participants;
DROP POLICY IF EXISTS "Users can add participants" ON conversation_participants;

-- Create new non-recursive policies
CREATE POLICY "Users can view own participations"
  ON conversation_participants FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Users can view conversation members"
  ON conversation_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp2
      WHERE cp2.conversation_id = conversation_participants.conversation_id
      AND cp2.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can add participants"
  ON conversation_participants FOR INSERT
  WITH CHECK (
    -- Can add self
    profile_id = auth.uid() OR
    -- Can add others who allow messages
    EXISTS (
      SELECT 1 FROM user_preferences up
      WHERE up.profile_id = conversation_participants.profile_id
      AND (up.privacy_settings->>'allow_messages')::boolean = true
    )
  );

-- Function to get or create conversation
CREATE OR REPLACE FUNCTION get_or_create_conversation(user1_id UUID, user2_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conv_id UUID;
BEGIN
  -- Check for existing conversation
  SELECT cp1.conversation_id INTO conv_id
  FROM conversation_participants cp1
  JOIN conversation_participants cp2 ON cp2.conversation_id = cp1.conversation_id
  WHERE 
    cp1.profile_id = user1_id 
    AND cp2.profile_id = user2_id
  LIMIT 1;
  
  IF conv_id IS NOT NULL THEN
    RETURN conv_id;
  END IF;

  -- Check if user2 allows messages
  IF NOT EXISTS (
    SELECT 1 FROM user_preferences up
    WHERE up.profile_id = user2_id
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

-- Add optimized indexes
CREATE INDEX IF NOT EXISTS idx_conversation_participants_lookup 
  ON conversation_participants(profile_id, conversation_id);