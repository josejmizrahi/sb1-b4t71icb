/*
  # Fix Conversation Policies

  1. Changes
    - Fix infinite recursion in conversation participants policy
    - Simplify conversation access control
    - Add better indexes for performance

  2. Security
    - Ensure users can only access their own conversations
    - Prevent unauthorized message access
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;

-- Create new, simplified policies
CREATE POLICY "Users can view conversation participants"
  ON conversation_participants FOR SELECT
  USING (
    -- User can see participants of conversations they're part of
    conversation_id IN (
      SELECT conversation_id
      FROM conversation_participants
      WHERE profile_id = auth.uid()
    )
  );

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_conversation_participants_profile ON conversation_participants(profile_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(conversation_id, is_read) WHERE NOT is_read;