-- Drop existing policies
DROP POLICY IF EXISTS "Users can view conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
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
CREATE POLICY "Users can view own participations"
  ON conversation_participants FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Users can view other participants"
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

-- Function to create a conversation
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