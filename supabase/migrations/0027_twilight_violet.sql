-- Drop existing policies
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can join conversations" ON conversation_participants;

-- Create new, simplified policies
CREATE POLICY "Users can view conversation participants"
  ON conversation_participants FOR SELECT
  USING (
    profile_id = auth.uid() OR
    conversation_id IN (
      SELECT conversation_id 
      FROM conversation_participants
      WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can join conversations"
  ON conversation_participants FOR INSERT
  WITH CHECK (
    auth.uid() IN (profile_id, (
      SELECT p.id FROM profiles p
      WHERE p.id = conversation_participants.profile_id
      AND EXISTS (
        SELECT 1 FROM user_preferences up
        WHERE up.profile_id = p.id
        AND (up.privacy_settings->>'allow_messages')::boolean = true
      )
    ))
  );

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_conversation_participants_lookup 
  ON conversation_participants(profile_id, conversation_id);