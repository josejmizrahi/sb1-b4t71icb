-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own participations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view other participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can add participants" ON conversation_participants;

-- Create new non-recursive policies
CREATE POLICY "Users can view participants"
  ON conversation_participants FOR SELECT
  USING (
    -- Can view own participations
    profile_id = auth.uid() OR
    -- Can view participants of conversations they're in
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

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_conversation_participants_lookup 
  ON conversation_participants(profile_id, conversation_id);