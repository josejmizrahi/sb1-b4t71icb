/*
  # Initial Schema Setup for Jewish Network State

  1. New Tables
    - `profiles`: Core user profile information
      - `id` (uuid, references auth.users)
      - `username` (text, unique)
      - `display_name` (text)
      - `email` (text, unique)
      - `avatar_url` (text)
      - `bio` (text)
      - `join_date` (timestamptz)
      - `verified` (boolean)
      - `status` (text)
      - `last_active` (timestamptz)

    - `user_preferences`: User settings and preferences
      - `profile_id` (uuid, references profiles)
      - `notification_settings` (jsonb)
      - `privacy_settings` (jsonb)
      - `language` (text)
      - `timezone` (text)

  2. Security
    - Enable RLS on all tables
    - Add policies for user data access
    - Set up secure defaults

  3. Triggers
    - Auto-create profile on user signup
    - Auto-create preferences on profile creation
*/

-- Create profiles table
CREATE TABLE profiles (
    id UUID REFERENCES auth.users PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    email TEXT UNIQUE,
    avatar_url TEXT,
    bio TEXT,
    join_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    verified BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'pending',
    last_active TIMESTAMP WITH TIME ZONE
);

-- Create user preferences table
CREATE TABLE user_preferences (
    profile_id UUID REFERENCES profiles(id) PRIMARY KEY,
    notification_settings JSONB DEFAULT '{
        "email_notifications": true,
        "push_notifications": true
    }'::jsonb,
    privacy_settings JSONB DEFAULT '{
        "profile_visibility": "public",
        "show_online_status": true
    }'::jsonb,
    language TEXT DEFAULT 'en',
    timezone TEXT DEFAULT 'UTC'
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
    ON profiles FOR SELECT
    USING (verified = true);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- User preferences policies
CREATE POLICY "Users can view own preferences"
    ON user_preferences FOR SELECT
    USING (profile_id = auth.uid());

CREATE POLICY "Users can update own preferences"
    ON user_preferences FOR UPDATE
    USING (profile_id = auth.uid());

CREATE POLICY "Users can insert own preferences"
    ON user_preferences FOR INSERT
    WITH CHECK (profile_id = auth.uid());

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.profiles (id, username, email)
    VALUES (
        NEW.id,
        LOWER(SPLIT_PART(NEW.email, '@', 1)),
        NEW.email
    );

    INSERT INTO public.user_preferences (profile_id)
    VALUES (NEW.id);

    RETURN NEW;
END;
$$;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();