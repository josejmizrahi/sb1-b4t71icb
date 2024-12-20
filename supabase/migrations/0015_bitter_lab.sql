/*
  # Add Notifications System

  1. New Tables
    - `notifications`
      - `id` (uuid, primary key)
      - `recipient_id` (uuid, references profiles)
      - `type` (text, notification type)
      - `title` (text)
      - `description` (text)
      - `link` (text, optional)
      - `read` (boolean)
      - `metadata` (jsonb)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on notifications table
    - Add policies for user access
    - Add function for creating notifications

  3. Indexes
    - Add indexes for common queries
*/

-- Create notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES profiles(id) NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT valid_notification_type CHECK (
    type IN ('message', 'achievement', 'event', 'governance', 'system')
  )
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (recipient_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Add indexes
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_unread ON notifications(recipient_id, read) WHERE NOT read;
CREATE INDEX idx_notifications_type ON notifications(recipient_id, type);

-- Function to create a notification
CREATE OR REPLACE FUNCTION create_notification(
  recipient_id UUID,
  type TEXT,
  title TEXT,
  description TEXT,
  link TEXT DEFAULT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (
    recipient_id,
    type,
    title,
    description,
    link,
    metadata
  )
  VALUES (
    recipient_id,
    type,
    title,
    description,
    link,
    metadata
  )
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$;

-- Function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_as_read(
  _notification_ids UUID[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notifications
  SET read = true
  WHERE id = ANY(_notification_ids)
  AND recipient_id = auth.uid();
END;
$$;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_as_read(
  _user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notifications
  SET read = true
  WHERE recipient_id = _user_id
  AND NOT read;
END;
$$;