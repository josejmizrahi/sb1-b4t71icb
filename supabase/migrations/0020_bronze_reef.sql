/*
  # Add privacy settings management

  1. Changes
    - Add default privacy settings for new users
    - Add function to update privacy settings
    - Add policies for privacy settings access

  2. Security
    - Users can only view and update their own privacy settings
    - Default settings are secure but flexible
*/

-- Update user_preferences default privacy settings
ALTER TABLE user_preferences 
ALTER COLUMN privacy_settings SET DEFAULT jsonb_build_object(
  'profile_visibility', 'members',
  'show_online_status', true,
  'show_last_active', true,
  'allow_messages', true,
  'show_achievements', true
);

-- Function to update privacy settings
CREATE OR REPLACE FUNCTION update_privacy_settings(
  settings jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_preferences
  SET 
    privacy_settings = settings,
    updated_at = CURRENT_TIMESTAMP
  WHERE profile_id = auth.uid();
END;
$$;

-- Add RLS policies for user_preferences
CREATE POLICY "Users can view their own preferences"
  ON user_preferences FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Users can update their own preferences"
  ON user_preferences FOR UPDATE
  USING (profile_id = auth.uid());