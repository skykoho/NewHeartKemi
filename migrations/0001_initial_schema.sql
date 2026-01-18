-- HeartKemy Database Schema
-- 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  nickname TEXT NOT NULL,
  character TEXT DEFAULT '💝',
  profile_image TEXT,
  google_id TEXT UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 글(포스트) 테이블
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  preview TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  likes INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 감정 키워드 테이블
CREATE TABLE IF NOT EXISTS emotion_keywords (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('warm', 'comfort', 'excitement', 'solitude', 'sincerity')),
  color TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 포스트-감정 키워드 연결 테이블
CREATE TABLE IF NOT EXISTS post_emotions (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  emotion_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (emotion_id) REFERENCES emotion_keywords(id) ON DELETE CASCADE,
  UNIQUE(post_id, emotion_id)
);

-- AI 분석 결과 테이블
CREATE TABLE IF NOT EXISTS ai_analyses (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  core_values TEXT NOT NULL, -- JSON array
  emotion_tone TEXT NOT NULL, -- JSON object
  keywords TEXT NOT NULL, -- JSON array
  pattern_changes TEXT, -- JSON object
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 편지 테이블
CREATE TABLE IF NOT EXISTS letters (
  id TEXT PRIMARY KEY,
  from_user_id TEXT NOT NULL,
  to_user_id TEXT NOT NULL,
  post_id TEXT,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  is_replied INTEGER DEFAULT 0,
  from_latitude REAL NOT NULL,
  from_longitude REAL NOT NULL,
  to_latitude REAL NOT NULL,
  to_longitude REAL NOT NULL,
  distance_km REAL NOT NULL,
  flight_duration_sec REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME,
  FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE SET NULL
);

-- 편지-감정 키워드 연결 테이블
CREATE TABLE IF NOT EXISTS letter_emotions (
  id TEXT PRIMARY KEY,
  letter_id TEXT NOT NULL,
  emotion_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (letter_id) REFERENCES letters(id) ON DELETE CASCADE,
  FOREIGN KEY (emotion_id) REFERENCES emotion_keywords(id) ON DELETE CASCADE,
  UNIQUE(letter_id, emotion_id)
);

-- 좋아요 테이블
CREATE TABLE IF NOT EXISTS likes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  UNIQUE(user_id, post_id)
);

-- 인덱스 생성
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
