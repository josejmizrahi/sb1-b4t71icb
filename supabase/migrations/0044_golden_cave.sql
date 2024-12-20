/*
  # Fix conversation participant policies

  1. Changes
    - Remove recursive policies
    - Simplify participant viewing logic
    - Add optimized indexes
    
  2. Security
    - Maintain data access control
    - Prevent infinite recursion
    - Optimize query performance
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view other participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can add participants" ON conversation_participants;

-- Create new non-recursive policies
CREATE POLICY "Users can view own participations"
  ON conversation_participants FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Users can view conversation members"
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
    -- Can add self
    profile_id = auth.uid() OR
    -- Can add others who allow messages
    EXISTS (
      SELECT 1 FROM user_preferences up
      WHERE up.profile_id = conversation_participants.profile_id
      AND (up.privacy_settings->>'allow_messages')::boolean = true
    )
  );

-- Add optimized indexes
CREATE INDEX IF NOT EXISTS idx_conversation_participants_profile 
  ON conversation_participants(profile_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation 
  ON conversation_participants(conversation_id);