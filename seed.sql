-- 기본 감정 키워드 삽입
INSERT OR IGNORE INTO emotion_keywords (id, name, type, color) VALUES
  ('warm-1', '따뜻함', 'warm', '#FFA500'),
  ('warm-2', '포근함', 'warm', '#FFB84D'),
  ('warm-3', '온기', 'warm', '#FFCC80'),
  ('comfort-1', '위로', 'comfort', '#87CEEB'),
  ('comfort-2', '평화', 'comfort', '#ADD8E6'),
  ('comfort-3', '안정', 'comfort', '#B0E0E6'),
  ('excitement-1', '설렘', 'excitement', '#9370DB'),
  ('excitement-2', '기쁨', 'excitement', '#BA55D3'),
  ('excitement-3', '즐거움', 'excitement', '#DDA0DD'),
  ('solitude-1', '고독', 'solitude', '#A9A9A9'),
  ('solitude-2', '외로움', 'solitude', '#808080'),
  ('solitude-3', '쓸쓸함', 'solitude', '#696969'),
  ('sincerity-1', '진심', 'sincerity', '#FFD700'),
  ('sincerity-2', '솔직함', 'sincerity', '#FFED4E'),
  ('sincerity-3', '진정성', 'sincerity', '#FFEAA7');

-- 테스트 사용자 생성
INSERT OR IGNORE INTO users (id, email, nickname, character, google_id) VALUES
  ('user-demo-1', 'demo1@heartkemy.com', '감성민지', '💫', 'demo1'),
  ('user-demo-2', 'demo2@heartkemy.com', '성찰준호', '🌙', 'demo2'),
  ('user-demo-3', 'demo3@heartkemy.com', '따뜻한소율', '☀️', 'demo3');

-- 테스트 포스트 생성 (서울 중심부 좌표들)
INSERT OR IGNORE INTO posts (id, user_id, content, preview, latitude, longitude, likes) VALUES
  ('post-1', 'user-demo-1', '오늘도 혼자 걷는 밤길이 조금 외롭네요. 하지만 이 고요함도 나쁘지 않아요. 별이 참 예쁘네요.', '오늘도 혼자 걷는 밤길이...', 37.5665, 126.9780, 12),
  ('post-2', 'user-demo-2', '카페에서 창밖을 보며 생각에 잠겼어요. 요즘 제 삶에 대해 많이 고민하고 있어요.', '카페에서 창밖을 보며...', 37.5700, 126.9850, 8),
  ('post-3', 'user-demo-3', '누군가 옆에 있어줬으면 하는 순간들이 있어요. 함께 견디고 싶은 마음.', '누군가 옆에 있어줬으면...', 37.5640, 126.9860, 15),
  ('post-4', 'user-demo-1', '따뜻한 커피 한 잔과 함께하는 조용한 오후. 이런 소소한 행복에 감사해요.', '따뜻한 커피 한 잔과...', 37.5720, 126.9760, 10),
  ('post-5', 'user-demo-2', '오늘은 특별히 좋은 일은 없었지만, 평범함 속에서 작은 위안을 찾았어요.', '오늘은 특별히 좋은 일은...', 37.5600, 126.9900, 6);

-- 포스트-감정 연결
INSERT OR IGNORE INTO post_emotions (id, post_id, emotion_id) VALUES
  ('pe-1', 'post-1', 'solitude-2'),
  ('pe-2', 'post-1', 'comfort-2'),
  ('pe-3', 'post-2', 'solitude-1'),
  ('pe-4', 'post-3', 'solitude-2'),
  ('pe-5', 'post-3', 'warm-1'),
  ('pe-6', 'post-4', 'warm-1'),
  ('pe-7', 'post-4', 'comfort-2'),
  ('pe-8', 'post-5', 'comfort-1'),
  ('pe-9', 'post-5', 'sincerity-1');
