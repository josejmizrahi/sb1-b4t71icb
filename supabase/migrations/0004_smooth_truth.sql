/*
  # Core Jewish Network State Schema

  1. New Tables
    - `events`
      - Community events and gatherings
    - `event_attendees`
      - Track event participation
    - `study_groups`
      - Learning circles and study sessions
    - `study_group_members`
      - Study group participation
    - `messages`
      - Peer-to-peer messaging
    - `points_log`
      - Track JNS Points earned by users

  2. Security
    - Enable RLS on all tables
    - Policies for creating and joining events
    - Policies for messaging
    - Policies for study groups

  3. Changes
    - Add new columns to profiles table for enhanced user profiles
*/

-- Create events table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES profiles(id) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    location TEXT,
    max_attendees INTEGER,
    is_online BOOLEAN DEFAULT false,
    meeting_link TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create event attendees table
CREATE TABLE event_attendees (
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'attending',
    joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id, profile_id)
);

-- Create study groups table
CREATE TABLE study_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES profiles(id) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    topic TEXT NOT NULL,
    level TEXT NOT NULL,
    max_members INTEGER,
    schedule JSONB,
    is_private BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create study group members table
CREATE TABLE study_group_members (
    group_id UUID REFERENCES study_groups(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id, profile_id)
);

-- Create messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES profiles(id) NOT NULL,
    recipient_id UUID REFERENCES profiles(id) NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create points log table
CREATE TABLE points_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) NOT NULL,
    points INTEGER NOT NULL,
    action_type TEXT NOT NULL,
    description TEXT,
    reference_id UUID,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Add new columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS interests TEXT[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS skills TEXT[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS achievements JSONB DEFAULT '[]'::jsonb;

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_log ENABLE ROW LEVEL SECURITY;

-- Events policies
CREATE POLICY "Events are viewable by everyone"
    ON events FOR SELECT
    USING (true);

CREATE POLICY "Users can create events"
    ON events FOR INSERT
    WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Event creators can update their events"
    ON events FOR UPDATE
    USING (auth.uid() = creator_id);

-- Event attendees policies
CREATE POLICY "Users can view event attendees"
    ON event_attendees FOR SELECT
    USING (true);

CREATE POLICY "Users can join events"
    ON event_attendees FOR INSERT
    WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can leave events"
    ON event_attendees FOR DELETE
    USING (auth.uid() = profile_id);

-- Study groups policies
CREATE POLICY "Users can view public study groups"
    ON study_groups FOR SELECT
    USING (NOT is_private OR EXISTS (
        SELECT 1 FROM study_group_members
        WHERE group_id = id AND profile_id = auth.uid()
    ));

CREATE POLICY "Users can create study groups"
    ON study_groups FOR INSERT
    WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Group creators can update their groups"
    ON study_groups FOR UPDATE
    USING (auth.uid() = creator_id);

-- Study group members policies
CREATE POLICY "Users can view group members"
    ON study_group_members FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM study_groups
        WHERE id = group_id AND (NOT is_private OR creator_id = auth.uid())
    ));

CREATE POLICY "Users can join groups"
    ON study_group_members FOR INSERT
    WITH CHECK (
        auth.uid() = profile_id AND
        EXISTS (
            SELECT 1 FROM study_groups
            WHERE id = group_id AND NOT is_private
        )
    );

-- Messages policies
CREATE POLICY "Users can view their messages"
    ON messages FOR SELECT
    USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send messages"
    ON messages FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

-- Points log policies
CREATE POLICY "Users can view their own points"
    ON points_log FOR SELECT
    USING (auth.uid() = profile_id);

-- Function to update total points
CREATE OR REPLACE FUNCTION update_total_points()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE profiles
    SET total_points = (
        SELECT COALESCE(SUM(points), 0)
        FROM points_log
        WHERE profile_id = NEW.profile_id
    )
    WHERE id = NEW.profile_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for points updates
CREATE TRIGGER on_points_logged
    AFTER INSERT ON points_log
    FOR EACH ROW
    EXECUTE FUNCTION update_total_points();

-- Function to award points for various actions
CREATE OR REPLACE FUNCTION award_points(
    user_id UUID,
    action TEXT,
    points INTEGER,
    ref_id UUID DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    INSERT INTO points_log (profile_id, points, action_type, reference_id)
    VALUES (user_id, points, action, ref_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;