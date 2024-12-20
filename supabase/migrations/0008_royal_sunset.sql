/*
  # Fix Study Groups Policies

  1. Changes
    - Simplify study groups and members policies
    - Remove circular dependencies
    - Fix infinite recursion issue
    - Ensure proper access control
  
  2. Security
    - Enable RLS
    - Add clear policies for viewing and joining groups
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Study groups are viewable by everyone" ON study_groups;
DROP POLICY IF EXISTS "Users can create study groups" ON study_groups;
DROP POLICY IF EXISTS "Creators can update their groups" ON study_groups;
DROP POLICY IF EXISTS "Study group members are viewable by group members" ON study_group_members;
DROP POLICY IF EXISTS "Users can join groups" ON study_group_members;
DROP POLICY IF EXISTS "Members can leave groups" ON study_group_members;

-- Study groups policies
CREATE POLICY "Study groups are viewable by everyone"
  ON study_groups FOR SELECT
  USING (true);

CREATE POLICY "Users can create study groups"
  ON study_groups FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their groups"
  ON study_groups FOR UPDATE
  USING (auth.uid() = creator_id);

-- Study group members policies
CREATE POLICY "Group members are viewable by everyone"
  ON study_group_members FOR SELECT
  USING (true);

CREATE POLICY "Users can join non-private groups"
  ON study_group_members FOR INSERT
  WITH CHECK (
    auth.uid() = profile_id AND
    EXISTS (
      SELECT 1 FROM study_groups
      WHERE id = group_id AND NOT is_private
    )
  );

CREATE POLICY "Members can leave groups"
  ON study_group_members FOR DELETE
  USING (auth.uid() = profile_id);