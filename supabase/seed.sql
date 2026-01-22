-- Seed data for HeartKemy (Supabase PostgreSQL)

-- Insert emotion keywords
INSERT INTO emotion_keywords (name, type, color) VALUES
  ('따뜻함', 'warm', '#FFA500'),
  ('포근함', 'warm', '#FFB84D'),
  ('온기', 'warm', '#FFCC80'),
  ('위로', 'comfort', '#87CEEB'),
  ('평화', 'comfort', '#ADD8E6'),
  ('안정', 'comfort', '#B0E0E6'),
  ('설렘', 'excitement', '#9370DB'),
  ('기쁨', 'excitement', '#BA55D3'),
  ('즐거움', 'excitement', '#DDA0DD'),
  ('고독', 'solitude', '#A9A9A9'),
  ('외로움', 'solitude', '#808080'),
  ('쓸쓸함', 'solitude', '#696969'),
  ('진심', 'sincerity', '#FFD700'),
  ('솔직함', 'sincerity', '#FFED4E'),
  ('진정성', 'sincerity', '#FFEAA7')
ON CONFLICT DO NOTHING;

-- Note: User data should be created through Supabase Auth, not directly
-- Demo posts will be created after users sign up through the app
