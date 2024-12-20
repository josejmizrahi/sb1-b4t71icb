/*
  # Add Governance Tables

  1. New Tables
    - `proposals`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `creator_id` (uuid, references profiles)
      - `category` (text)
      - `status` (text)
      - `voting_end_date` (timestamptz)
      - `min_points_required` (integer)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `votes`
      - `id` (uuid, primary key)
      - `proposal_id` (uuid, references proposals)
      - `voter_id` (uuid, references profiles)
      - `choice` (text)
      - `comment` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for viewing and creating proposals
    - Add policies for voting
*/

-- Create proposals table
CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  creator_id UUID REFERENCES profiles(id) NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  voting_end_date TIMESTAMPTZ NOT NULL,
  min_points_required INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT valid_category CHECK (category IN ('general', 'policy', 'technical', 'financial')),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'active', 'completed', 'cancelled'))
);

-- Create votes table
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE NOT NULL,
  voter_id UUID REFERENCES profiles(id) NOT NULL,
  choice TEXT NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT valid_choice CHECK (choice IN ('yes', 'no', 'abstain')),
  CONSTRAINT one_vote_per_proposal UNIQUE (proposal_id, voter_id)
);

-- Enable RLS
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Proposals policies
CREATE POLICY "Proposals are viewable by everyone"
  ON proposals FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create proposals"
  ON proposals FOR INSERT
  WITH CHECK (
    auth.uid() = creator_id AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND total_points >= min_points_required
    )
  );

CREATE POLICY "Creators can update their proposals"
  ON proposals FOR UPDATE
  USING (auth.uid() = creator_id);

-- Votes policies
CREATE POLICY "Votes are viewable by everyone"
  ON votes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can vote on active proposals"
  ON votes FOR INSERT
  WITH CHECK (
    auth.uid() = voter_id AND
    EXISTS (
      SELECT 1 FROM proposals p
      JOIN profiles pr ON pr.id = auth.uid()
      WHERE p.id = proposal_id
      AND p.status = 'active'
      AND pr.total_points >= p.min_points_required
    )
  );

-- Function to close expired proposals
CREATE OR REPLACE FUNCTION close_expired_proposals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE proposals
  SET 
    status = 'completed',
    updated_at = CURRENT_TIMESTAMP
  WHERE 
    status = 'active' 
    AND voting_end_date < CURRENT_TIMESTAMP;
END;
$$;