# In-Sync — Couples PWA

A Progressive Web Application for couples to stay connected. Share memories, chat in real-time, track moods, set shared goals, and maintain your relationship timeline — all synced across devices.

## Features

### Pairing System
- Create an account and get a unique 6-character pairing code
- Share your code with your partner to link accounts
- Both users see shared content in real-time

### Shared Memories
- Upload photos, videos, and text memories
- Memories are shared between both partners
- Add comments to each other's posts
- Chronological timeline view

### Real-Time Chat
- 1:1 messaging between partners
- Messages sync instantly via Supabase subscriptions
- Conversation history persists across sessions

### Mood Tracking
- Log daily moods with optional notes
- View your partner's mood entries
- Emotional awareness and support

### Shared Goals
- Create relationship goals together
- Track completion status
- Mark goals as done collaboratively

### Relationship Milestones
- Track your relationship duration
- Anniversary counter and milestone display

### Customization
- 5 built-in themes: Cherry Blossom, Baby Pink, Ocean Breeze, Mint Leaf, Lavender Night
- Personalize the app's appearance to your taste

### PWA Support
- Installable on any device
- Offline caching for core functionality
- Responsive mobile-first design

## Tech Stack

- **HTML5**, **CSS3**, **Vanilla JavaScript** (ES6+)
- **Supabase** — Authentication, Database (PostgreSQL), Storage, Real-time subscriptions
- **Service Worker** — Offline support and caching
- **Web Notifications API** — Push alerts for messages

## Quick Start

### 1. Set Up Supabase

1. Create a project at [Supabase](https://supabase.com)
2. Create the following tables in your database:

```sql
-- Profiles
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  pair_code TEXT UNIQUE NOT NULL,
  partner_id UUID REFERENCES profiles(id)
);

-- Memories
CREATE TABLE memories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  partner_id UUID REFERENCES profiles(id) NOT NULL,
  type TEXT NOT NULL,
  title TEXT,
  description TEXT,
  uri TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id UUID REFERENCES profiles(id) NOT NULL,
  to_user_id UUID REFERENCES profiles(id) NOT NULL,
  text TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Memory Comments
CREATE TABLE memory_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  memory_id UUID REFERENCES memories(id) NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goals
CREATE TABLE goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  partner_id UUID REFERENCES profiles(id) NOT NULL,
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mood Entries
CREATE TABLE mood_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  partner_id UUID REFERENCES profiles(id) NOT NULL,
  mood TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

3. Create a Storage bucket named `memories`
4. Set up Row Level Security (RLS) policies for each table

### 2. Configure the App

Edit `js/supabase.js` and replace the Supabase URL and anon key with your own:

```js
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';
```

### 3. Run Locally

Serve the files with any static server:

```bash
npx serve .
```

Open `http://localhost:3000` in your browser.

### 4. Deploy

This is a **static PWA** — deploy anywhere:

1. Push to GitHub
2. Enable **GitHub Pages** (Settings > Pages)
3. Select `main` branch as source

## Project Structure

```
in-sync-main/
├── index.html          # Auth screen entry point
├── home.html           # Main app home (memories feed)
├── pairing.html        # Partner pairing screen
├── paywall.html        # Premium features screen
├── manifest.json       # PWA manifest
├── sw.js               # Service worker
├── icon-500.png        # App icon
├── css/
│   └── style.css       # All styles with theme variables
├── js/
│   ├── supabase.js     # Supabase client & all DB functions
│   ├── app.js          # Auth logic
│   ├── router.js       # Screen navigation
│   ├── home.js         # Home feed rendering
│   ├── chat.js         # Real-time messaging
│   ├── pairing.js      # Partner pairing logic
│   ├── new-memory.js   # Memory creation
│   ├── relationship.js # Relationship/milestone logic
│   ├── settings.js     # User settings & themes
│   ├── goals.js        # Shared goals management
│   ├── notifications.js# Push notification handling
│   ├── cache.js        # Service worker cache config
│   └── module-loader.js# Dynamic screen loading
└── README.md
```

---

**In-Sync** — Stay connected, always.
