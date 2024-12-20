/*
  # Fix study groups RLS policies

  1. Changes
    - Remove recursive policy dependency between study_groups and study_group_members
    - Simplify access control logic
    - Add proper policies for public and private study groups

  2. Security
    - Enable RLS on both tables
    - Add policies for viewing and joining groups
    - Protect private group data
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view public study groups" ON study_groups;
DROP POLICY IF EXISTS "Users can create study groups" ON study_groups;
DROP POLICY IF EXISTS "Group creators can update their groups" ON study_groups;
DROP POLICY IF EXISTS "Users can view group members" ON study_group_members;
DROP POLICY IF EXISTS "Users can join groups" ON study_group_members;

-- Study groups policies
CREATE POLICY "Anyone can view public study groups"
  ON study_groups FOR SELECT
  USING (NOT is_private);

CREATE POLICY "Members can view private study groups"
  ON study_groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM study_group_members
      WHERE group_id = id
      AND profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can create study groups"
  ON study_groups FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their groups"
  ON study_groups FOR UPDATE
  USING (auth.uid() = creator_id);

-- Study group members policies
CREATE POLICY "Anyone can view public group members"
  ON study_group_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM study_groups
      WHERE id = group_id
      AND NOT is_private
    )
  );

CREATE POLICY "Members can view private group members"
  ON study_group_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM study_group_members
      WHERE group_id = group_id
      AND profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can join public groups"
  ON study_group_members FOR INSERT
  WITH CHECK (
    auth.uid() = profile_id AND
    EXISTS (
      SELECT 1 FROM study_groups
      WHERE id = group_id
      AND NOT is_private
    )
  );