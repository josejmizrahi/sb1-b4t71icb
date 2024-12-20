/*
  # Fundraising Schema

  1. New Tables
    - `fundraising_campaigns`
      - Core campaign information
      - Status tracking
      - Financial goals and progress
    - `campaign_donations`
      - Individual donation records
      - Donor information
      - Payment tracking
  
  2. Security
    - Enable RLS on all tables
    - Policies for campaign creation and viewing
    - Policies for donations
*/

-- Create fundraising campaigns table
CREATE TABLE fundraising_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES profiles(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  goal_amount INTEGER NOT NULL,
  current_amount INTEGER DEFAULT 0,
  start_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  end_date TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'active',
  category TEXT NOT NULL,
  image_url TEXT,
  updates JSONB[] DEFAULT ARRAY[]::JSONB[],
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT valid_status CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  CONSTRAINT valid_category CHECK (category IN ('community', 'education', 'charity', 'emergency', 'other')),
  CONSTRAINT valid_amount CHECK (goal_amount > 0)
);

-- Create campaign donations table
CREATE TABLE campaign_donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES fundraising_campaigns(id) NOT NULL,
  donor_id UUID REFERENCES profiles(id) NOT NULL,
  amount INTEGER NOT NULL,
  message TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending',
  transaction_id TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT valid_status CHECK (status IN ('pending', 'completed', 'failed')),
  CONSTRAINT valid_amount CHECK (amount > 0)
);

-- Enable RLS
ALTER TABLE fundraising_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_donations ENABLE ROW LEVEL SECURITY;

-- Fundraising campaigns policies
CREATE POLICY "Campaigns are viewable by everyone"
  ON fundraising_campaigns FOR SELECT
  USING (true);

CREATE POLICY "Users can create campaigns"
  ON fundraising_campaigns FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Campaign creators can update their campaigns"
  ON fundraising_campaigns FOR UPDATE
  USING (auth.uid() = creator_id);

-- Campaign donations policies
CREATE POLICY "Donations are viewable by campaign creators and donors"
  ON campaign_donations FOR SELECT
  USING (
    auth.uid() = donor_id OR
    EXISTS (
      SELECT 1 FROM fundraising_campaigns
      WHERE id = campaign_id AND creator_id = auth.uid()
    )
  );

CREATE POLICY "Users can create donations"
  ON campaign_donations FOR INSERT
  WITH CHECK (auth.uid() = donor_id);

-- Function to update campaign amount
CREATE OR REPLACE FUNCTION update_campaign_amount()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    UPDATE fundraising_campaigns
    SET 
      current_amount = current_amount + NEW.amount,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.campaign_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for updating campaign amount
CREATE TRIGGER on_donation_completed
  AFTER INSERT OR UPDATE ON campaign_donations
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_amount();

-- Function to check campaign status
CREATE OR REPLACE FUNCTION check_campaign_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if campaign has reached its goal
  IF NEW.current_amount >= NEW.goal_amount AND NEW.status = 'active' THEN
    NEW.status := 'completed';
  END IF;

  -- Check if campaign has expired
  IF NEW.end_date < CURRENT_TIMESTAMP AND NEW.status = 'active' THEN
    NEW.status := 'completed';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for campaign status updates
CREATE TRIGGER check_campaign_status
  BEFORE UPDATE ON fundraising_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION check_campaign_status();