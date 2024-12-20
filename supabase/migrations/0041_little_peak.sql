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

-- Non-recursive participant policies
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

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_conversation_participants_profile_conv 
  ON conversation_participants(profile_id, conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_read 
  ON messages(conversation_id, is_read) 
  WHERE NOT is_read;