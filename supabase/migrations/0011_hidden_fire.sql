/*
  # Update Governance System

  1. Changes
    - Add missing indexes for performance
    - Add trigger for proposal status updates
    - Add function to calculate vote results
*/

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_category ON proposals(category);
CREATE INDEX IF NOT EXISTS idx_votes_proposal_id ON votes(proposal_id);

-- Function to calculate vote results
CREATE OR REPLACE FUNCTION calculate_vote_results(proposal_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  results jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_votes', COUNT(*),
    'yes_votes', COUNT(*) FILTER (WHERE choice = 'yes'),
    'no_votes', COUNT(*) FILTER (WHERE choice = 'no'),
    'abstain_votes', COUNT(*) FILTER (WHERE choice = 'abstain')
  )
  INTO results
  FROM votes
  WHERE proposal_id = $1;
  
  RETURN results;
END;
$$;

-- Function to automatically update proposal status
CREATE OR REPLACE FUNCTION update_proposal_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the proposal should be marked as completed
  IF NEW.voting_end_date < CURRENT_TIMESTAMP AND NEW.status = 'active' THEN
    NEW.status := 'completed';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for proposal status updates
DROP TRIGGER IF EXISTS check_proposal_status ON proposals;
CREATE TRIGGER check_proposal_status
  BEFORE UPDATE ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_proposal_status();