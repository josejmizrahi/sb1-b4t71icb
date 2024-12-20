/*
  # Fix study groups RLS policies - Version 2

  1. Changes
    - Simplify member viewing policies to prevent recursion
    - Add separate policies for creators
    - Fix circular dependency in private group access

  2. Security
    - Maintain proper access control
    - Prevent unauthorized access to private groups
    - Allow proper member management
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view public study groups" ON study_groups;
DROP POLICY IF EXISTS "Members can view private study groups" ON study_groups;
DROP POLICY IF EXISTS "Users can create study groups" ON study_groups;
DROP POLICY IF EXISTS "Creators can update their groups" ON study_groups;
DROP POLICY IF EXISTS "Anyone can view public group members" ON study_group_members;
DROP POLICY IF EXISTS "Members can view private group members" ON study_group_members;
DROP POLICY IF EXISTS "Users can join public groups" ON study_group_members;

-- Study groups policies
CREATE POLICY "Study groups are viewable by everyone"
  ON study_groups FOR SELECT
  USING (
    NOT is_private OR 
    creator_id = auth.uid() OR
    id IN (
      SELECT group_id 
      FROM study_group_members 
      WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can create study groups"
  ON study_groups FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their groups"
  ON study_groups FOR UPDATE
  USING (auth.uid() = creator_id);

-- Study group members policies
CREATE POLICY "Study group members are viewable by group members"
  ON study_group_members FOR SELECT
  USING (
    profile_id = auth.uid() OR
    group_id IN (
      SELECT id 
      FROM study_groups 
      WHERE NOT is_private OR creator_id = auth.uid()
    )
  );

CREATE POLICY "Users can join groups"
  ON study_group_members FOR INSERT
  WITH CHECK (
    auth.uid() = profile_id AND
    group_id IN (
      SELECT id 
      FROM study_groups 
      WHERE NOT is_private OR creator_id = auth.uid()
    )
  );

CREATE POLICY "Members can leave groups"
  ON study_group_members FOR DELETE
  USING (auth.uid() = profile_id);