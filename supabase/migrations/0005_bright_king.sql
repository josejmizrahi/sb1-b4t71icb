/*
  # Points System Setup

  1. New Tables
    - points_log: Tracks all point transactions

  2. Functions
    - get_user_stats: Calculate user statistics
    - award_points: Award points to users

  Note: Policies are only created if they don't exist
*/

-- Points log table
CREATE TABLE IF NOT EXISTS points_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) NOT NULL,
  points INTEGER NOT NULL,
  action_type TEXT NOT NULL,
  description TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Add points column to profiles if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'total_points'
  ) THEN
    ALTER TABLE profiles ADD COLUMN total_points INTEGER DEFAULT 0;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE points_log ENABLE ROW LEVEL SECURITY;

-- Points log policies (only create if they don't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'points_log' AND policyname = 'Users can view their own points'
  ) THEN
    CREATE POLICY "Users can view their own points"
      ON points_log
      FOR SELECT
      USING (auth.uid() = profile_id);
  END IF;
END $$;

-- Function to get user stats
CREATE OR REPLACE FUNCTION get_user_stats(user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_points', COALESCE(p.total_points, 0),
    'events_attended', (
      SELECT COUNT(*) 
      FROM event_attendees 
      WHERE profile_id = user_id AND status = 'attending'
    ),
    'study_groups_joined', (
      SELECT COUNT(*) 
      FROM study_group_members 
      WHERE profile_id = user_id
    )
  )
  INTO result
  FROM profiles p
  WHERE p.id = user_id;

  RETURN result;
END;
$$;

-- Function to award points
CREATE OR REPLACE FUNCTION award_points(
  user_id UUID,
  action TEXT,
  points INTEGER,
  ref_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert points log entry
  INSERT INTO points_log (
    profile_id,
    points,
    action_type,
    reference_id
  ) VALUES (
    user_id,
    points,
    action,
    ref_id
  );

  -- Update total points
  UPDATE profiles
  SET total_points = total_points + points
  WHERE id = user_id;
END;
$$;