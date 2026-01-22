-- HeartKemy PostgreSQL Schema for Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (Supabase Auth와 연동)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  nickname TEXT NOT NULL,
  character TEXT DEFAULT '💝',
  profile_image TEXT,
  google_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  preview TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Emotion keywords table
CREATE TABLE IF NOT EXISTS emotion_keywords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('warm', 'comfort', 'excitement', 'solitude', 'sincerity')),
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Post-emotion relationship table
CREATE TABLE IF NOT EXISTS post_emotions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  emotion_id UUID NOT NULL REFERENCES emotion_keywords(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, emotion_id)
);

-- AI analyses table
CREATE TABLE IF NOT EXISTS ai_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  core_values JSONB NOT NULL,
  emotion_tone JSONB NOT NULL,
  keywords JSONB NOT NULL,
  pattern_changes JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Letters table
CREATE TABLE IF NOT EXISTS letters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  is_replied BOOLEAN DEFAULT FALSE,
  from_latitude DOUBLE PRECISION NOT NULL,
  from_longitude DOUBLE PRECISION NOT NULL,
  to_latitude DOUBLE PRECISION NOT NULL,
  to_longitude DOUBLE PRECISION NOT NULL,
  distance_km DOUBLE PRECISION NOT NULL,
  flight_duration_sec DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- Letter-emotion relationship table
CREATE TABLE IF NOT EXISTS letter_emotions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  letter_id UUID NOT NULL REFERENCES letters(id) ON DELETE CASCADE,
  emotion_id UUID NOT NULL REFERENCES emotion_keywords(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(letter_id, emotion_id)
);

-- Likes table
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_location ON posts(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_letters_from_user ON letters(from_user_id);
CREATE INDEX IF NOT EXISTS idx_letters_to_user ON letters(to_user_id);
CREATE INDEX IF NOT EXISTS idx_letters_created_at ON letters(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_likes_user_post ON likes(user_id, post_id);
CREATE INDEX IF NOT EXISTS idx_post_emotions_post ON post_emotions(post_id);
CREATE INDEX IF NOT EXISTS idx_letter_emotions_letter ON letter_emotions(letter_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_user ON ai_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_created ON ai_analyses(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE emotion_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_emotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE letter_emotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users: Users can read all, but only update their own
CREATE POLICY "Users can view all users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Posts: Anyone can read, authenticated users can create, users can update/delete own posts
CREATE POLICY "Anyone can view posts" ON posts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create posts" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON posts FOR DELETE USING (auth.uid() = user_id);

-- Emotion keywords: Anyone can read
CREATE POLICY "Anyone can view emotion keywords" ON emotion_keywords FOR SELECT USING (true);

-- Post emotions: Anyone can read, authenticated users can manage their post emotions
CREATE POLICY "Anyone can view post emotions" ON post_emotions FOR SELECT USING (true);
CREATE POLICY "Users can manage own post emotions" ON post_emotions FOR ALL USING (
  EXISTS (SELECT 1 FROM posts WHERE posts.id = post_emotions.post_id AND posts.user_id = auth.uid())
);

-- AI analyses: Users can only see their own
CREATE POLICY "Users can view own analyses" ON ai_analyses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own analyses" ON ai_analyses FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Letters: Users can view letters they sent or received
CREATE POLICY "Users can view own letters" ON letters FOR SELECT USING (
  auth.uid() = from_user_id OR auth.uid() = to_user_id
);
CREATE POLICY "Users can create letters" ON letters FOR INSERT WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "Recipients can update read status" ON letters FOR UPDATE USING (auth.uid() = to_user_id);

-- Letter emotions: Users can view and manage emotions for their letters
CREATE POLICY "Users can view letter emotions" ON letter_emotions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM letters 
    WHERE letters.id = letter_emotions.letter_id 
    AND (letters.from_user_id = auth.uid() OR letters.to_user_id = auth.uid())
  )
);
CREATE POLICY "Users can manage own letter emotions" ON letter_emotions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM letters 
    WHERE letters.id = letter_emotions.letter_id 
    AND letters.from_user_id = auth.uid()
  )
);

-- Likes: Anyone can view, authenticated users can manage their own likes
CREATE POLICY "Anyone can view likes" ON likes FOR SELECT USING (true);
CREATE POLICY "Users can manage own likes" ON likes FOR ALL USING (auth.uid() = user_id);

-- Functions

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for posts
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for users
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
