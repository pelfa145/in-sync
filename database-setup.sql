-- Database Setup Script for In-Sync Relationship Features
-- Run this in your Supabase SQL Editor

-- Create goals table for couple bucket lists
CREATE TABLE IF NOT EXISTS goals (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    partner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    text text NOT NULL,
    completed boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create mood_entries table for daily relationship check-ins
CREATE TABLE IF NOT EXISTS mood_entries (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    partner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    mood integer NOT NULL CHECK (mood >= 1 AND mood <= 5),
    note text,
    created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_partner_id ON goals(partner_id);
CREATE INDEX IF NOT EXISTS idx_goals_created_at ON goals(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mood_entries_user_id ON mood_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_mood_entries_partner_id ON mood_entries(partner_id);
CREATE INDEX IF NOT EXISTS idx_mood_entries_created_at ON mood_entries(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for goals table
CREATE POLICY "Users can view their own and partner's goals" ON goals
    FOR SELECT USING (
        auth.uid() = user_id OR 
        auth.uid() = partner_id
    );

CREATE POLICY "Users can insert their own goals" ON goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals" ON goals
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals" ON goals
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for mood_entries table
CREATE POLICY "Users can view their own and partner's mood entries" ON mood_entries
    FOR SELECT USING (
        auth.uid() = user_id OR 
        auth.uid() = partner_id
    );

CREATE POLICY "Users can insert their own mood entries" ON mood_entries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_goals_updated_at 
    BEFORE UPDATE ON goals 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON goals TO authenticated;
GRANT ALL ON mood_entries TO authenticated;
GRANT ALL ON goals TO anon;
GRANT ALL ON mood_entries TO anon;
