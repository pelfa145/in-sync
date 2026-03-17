-- Database Setup Script for In-Sync Relationship Features
-- Run this in your Supabase SQL Editor

-- 1. Create app_settings table for VAPID keys
CREATE TABLE IF NOT EXISTS app_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT NOT NULL,
    value TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Create push_subscriptions table for storing push notification subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Create goals table for couple bucket lists
CREATE TABLE IF NOT EXISTS goals (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    partner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    text text NOT NULL,
    completed boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 4. Create mood_entries table for daily relationship check-ins
CREATE TABLE IF NOT EXISTS mood_entries (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    partner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    mood integer NOT NULL CHECK (mood >= 1 AND mood <= 5),
    note text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_partner_id ON goals(partner_id);
CREATE INDEX IF NOT EXISTS idx_goals_created_at ON goals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mood_entries_user_id ON mood_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_mood_entries_partner_id ON mood_entries(partner_id);
CREATE INDEX IF NOT EXISTS idx_mood_entries_created_at ON mood_entries(created_at DESC);

-- 6. Enable Row Level Security (RLS) for app_settings
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own settings" ON app_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" ON app_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON app_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- 7. Enable RLS for push_subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own subscriptions" ON push_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions" ON push_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" ON push_subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

-- 8. Enable RLS for goals table
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_entries ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies for goals table
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

-- 10. Create RLS policies for mood_entries table
CREATE POLICY "Users can view their own and partner's mood entries" ON mood_entries
    FOR SELECT USING (
        auth.uid() = user_id OR 
        auth.uid() = partner_id
    );

CREATE POLICY "Users can insert their own mood entries" ON mood_entries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mood entries" ON mood_entries
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mood entries" ON mood_entries
    FOR DELETE USING (auth.uid() = user_id);

-- 11. Insert your actual VAPID public key
INSERT INTO app_settings (key, value) VALUES 
('vapid_public_key', 'BGCErG_107dOIO0EhAcYFdfZfFQSZJzxnA3WO2_rYA08a17jk5lx2832cwi13WAt1qF0KfbMCRu8aiaQlwPFCEE')
ON CONFLICT DO NOTHING;

-- 12. Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 13. Create triggers to automatically update updated_at
CREATE TRIGGER update_goals_updated_at 
    BEFORE UPDATE ON goals 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mood_entries_updated_at 
    BEFORE UPDATE ON mood_entries 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 14. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON app_settings TO authenticated;
GRANT INSERT ON app_settings TO authenticated;
GRANT UPDATE ON app_settings TO authenticated;
GRANT SELECT ON push_subscriptions TO authenticated;
GRANT INSERT ON push_subscriptions TO authenticated;
GRANT UPDATE ON push_subscriptions TO authenticated;
GRANT SELECT ON goals TO authenticated;
GRANT INSERT ON goals TO authenticated;
GRANT UPDATE ON goals TO authenticated;
GRANT DELETE ON goals TO authenticated;
GRANT SELECT ON mood_entries TO authenticated;
GRANT INSERT ON mood_entries TO authenticated;
GRANT UPDATE ON mood_entries TO authenticated;
GRANT DELETE ON mood_entries TO authenticated;
