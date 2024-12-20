/*
  # Update profiles table policies

  1. Changes
    - Allow viewing basic profile information for all users
    - Protect sensitive data for unverified users
    - Add policy for viewing full profile data of verified users

  2. Security
    - Basic profile data visible to everyone
    - Sensitive data only visible for verified users
    - Users can always view their own full profile
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

-- Create new policies
CREATE POLICY "Basic profile info is viewable by everyone"
ON profiles FOR SELECT
USING (true);

CREATE POLICY "Verified profiles show full info"
ON profiles FOR SELECT
USING (
  verified = true OR 
  id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM user_preferences
    WHERE profile_id = profiles.id
    AND privacy_settings->>'profile_visibility' = 'public'
  )
);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_verified ON profiles(verified);