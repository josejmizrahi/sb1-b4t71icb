/*
  # Polls Schema

  1. New Tables
    - `polls`
      - Core poll information
      - Status tracking
      - Expiry date
    - `poll_options`
      - Individual poll options
    - `poll_votes`
      - User votes tracking
  
  2. Security
    - Enable RLS on all tables
    - Policies for poll creation and voting
*/

-- Create polls table
CREATE TABLE polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES profiles(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  expiry_date TIMESTAMPTZ NOT NULL,
  allow_multiple_votes BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT valid_status CHECK (status IN ('active', 'completed', 'cancelled'))
);

-- Create poll options table
CREATE TABLE poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create poll votes table
CREATE TABLE poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE NOT NULL,
  option_id UUID REFERENCES poll_options(id) ON DELETE CASCADE NOT NULL,
  voter_id UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  -- Prevent multiple votes unless allowed
  CONSTRAINT one_vote_per_poll UNIQUE (poll_id, voter_id, option_id)
);

-- Enable RLS
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

-- Polls policies
CREATE POLICY "Polls are viewable by everyone"
  ON polls FOR SELECT
  USING (true);

CREATE POLICY "Users can create polls"
  ON polls FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Poll creators can update their polls"
  ON polls FOR UPDATE
  USING (auth.uid() = creator_id);

-- Poll options policies
CREATE POLICY "Poll options are viewable by everyone"
  ON poll_options FOR SELECT
  USING (true);

CREATE POLICY "Poll creators can manage options"
  ON poll_options
  USING (
    EXISTS (
      SELECT 1 FROM polls
      WHERE id = poll_id AND creator_id = auth.uid()
    )
  );

-- Poll votes policies
CREATE POLICY "Poll votes are viewable by everyone"
  ON poll_votes FOR SELECT
  USING (true);

CREATE POLICY "Users can vote on active polls"
  ON poll_votes FOR INSERT
  WITH CHECK (
    auth.uid() = voter_id AND
    EXISTS (
      SELECT 1 FROM polls
      WHERE id = poll_id
      AND status = 'active'
      AND expiry_date > CURRENT_TIMESTAMP
    )
  );

-- Function to check poll status
CREATE OR REPLACE FUNCTION check_poll_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if poll has expired
  IF NEW.expiry_date < CURRENT_TIMESTAMP AND NEW.status = 'active' THEN
    NEW.status := 'completed';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for poll status updates
CREATE TRIGGER check_poll_status
  BEFORE UPDATE ON polls
  FOR EACH ROW
  EXECUTE FUNCTION check_poll_status();

-- Function to get poll results
CREATE OR REPLACE FUNCTION get_poll_results(poll_id UUID)
RETURNS TABLE (
  option_id UUID,
  option_text TEXT,
  vote_count BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT 
    po.id as option_id,
    po.text as option_text,
    COUNT(pv.id) as vote_count
  FROM poll_options po
  LEFT JOIN poll_votes pv ON po.id = pv.option_id
  WHERE po.poll_id = $1
  GROUP BY po.id, po.text
  ORDER BY vote_count DESC;
$$;