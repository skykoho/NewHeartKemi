import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS 활성화
app.use('/api/*', cors())

// 정적 파일 제공
app.use('/static/*', serveStatic({ root: './public' }))

// ======================
// API 라우트
// ======================

// 1. 사용자 관련 API
app.get('/api/users/me', async (c) => {
  // 임시로 데모 사용자 반환 (실제로는 세션/JWT 체크)
  return c.json({
    success: true,
    data: {
      id: 'user-demo-1',
      email: 'demo1@heartkemy.com',
      nickname: '감성민지',
      character: '💫'
    }
  })
})

// 2. 글(포스트) 관련 API
app.get('/api/posts', async (c) => {
  const { env } = c
  const limit = c.req.query('limit') || '50'
  
  try {
    const result = await env.DB.prepare(`
      SELECT 
        p.*,
        u.nickname as author_nickname,
        u.character as author_character,
        GROUP_CONCAT(ek.id || ':' || ek.name || ':' || ek.type || ':' || ek.color) as emotions
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN post_emotions pe ON p.id = pe.post_id
      LEFT JOIN emotion_keywords ek ON pe.emotion_id = ek.id
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT ?
    `).bind(parseInt(limit)).all()

    const posts = result.results.map((row: any) => ({
      id: row.id,
      author: {
        id: row.user_id,
        nickname: row.author_nickname,
        character: row.author_character
      },
      content: row.content,
      preview: row.preview,
      location: {
        lat: row.latitude,
        lng: row.longitude
      },
      emotionKeywords: row.emotions ? row.emotions.split(',').map((e: string) => {
        const [id, name, type, color] = e.split(':')
        return { id, name, type, color }
      }) : [],
      likes: row.likes,
      isLiked: false, // TODO: 사용자별 좋아요 상태 체크
      createdAt: row.created_at
    }))

    return c.json({ success: true, data: posts })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to fetch posts' }, 500)
  }
})

app.post('/api/posts', async (c) => {
  const { env } = c
  const body = await c.req.json()
  const { userId, content, preview, latitude, longitude, emotionIds } = body

  if (!userId || !content || !preview || !latitude || !longitude) {
    return c.json({ success: false, error: 'Missing required fields' }, 400)
  }

  try {
    const postId = `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // 포스트 생성
    await env.DB.prepare(`
      INSERT INTO posts (id, user_id, content, preview, latitude, longitude)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(postId, userId, content, preview, latitude, longitude).run()

    // 감정 키워드 연결
    if (emotionIds && emotionIds.length > 0) {
      for (const emotionId of emotionIds) {
        const peId = `pe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        await env.DB.prepare(`
          INSERT INTO post_emotions (id, post_id, emotion_id)
          VALUES (?, ?, ?)
        `).bind(peId, postId, emotionId).run()
      }
    }

    return c.json({ success: true, data: { id: postId } })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to create post' }, 500)
  }
})

// 포스트 위치 업데이트
app.patch('/api/posts/:id/location', async (c) => {
  const { env } = c
  const postId = c.req.param('id')
  const body = await c.req.json()
  const { latitude, longitude } = body

  if (!latitude || !longitude) {
    return c.json({ success: false, error: 'Missing location data' }, 400)
  }

  try {
    await env.DB.prepare(`
      UPDATE posts 
      SET latitude = ?, longitude = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(latitude, longitude, postId).run()

    return c.json({ success: true })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to update location' }, 500)
  }
})

// 3. 좋아요 API
app.post('/api/posts/:id/like', async (c) => {
  const { env } = c
  const postId = c.req.param('id')
  const body = await c.req.json()
  const { userId } = body

  if (!userId) {
    return c.json({ success: false, error: 'Missing userId' }, 400)
  }

  try {
    const likeId = `like-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // 좋아요 추가
    await env.DB.prepare(`
      INSERT OR IGNORE INTO likes (id, user_id, post_id)
      VALUES (?, ?, ?)
    `).bind(likeId, userId, postId).run()

    // 포스트 좋아요 수 증가
    await env.DB.prepare(`
      UPDATE posts SET likes = likes + 1 WHERE id = ?
    `).bind(postId).run()

    return c.json({ success: true })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to like post' }, 500)
  }
})

// 4. 감정 키워드 API
app.get('/api/emotions', async (c) => {
  const { env } = c
  
  try {
    const result = await env.DB.prepare(`
      SELECT * FROM emotion_keywords ORDER BY type, name
    `).all()

    return c.json({ success: true, data: result.results })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to fetch emotions' }, 500)
  }
})

// 5. AI 분석 API
app.post('/api/analysis', async (c) => {
  const { env } = c
  const body = await c.req.json()
  const { postId, userId, content } = body

  if (!postId || !userId || !content) {
    return c.json({ success: false, error: 'Missing required fields' }, 400)
  }

  try {
    // TODO: OpenAI GPT-4 호출 (실제 구현 시 환경변수에서 API 키 가져오기)
    // 현재는 더미 데이터 반환
    const analysisId = `analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const analysis = {
      coreValues: ['진정성', '공감', '자기이해'],
      emotionTone: {
        warm: 20,
        comfort: 30,
        excitement: 10,
        solitude: 25,
        sincerity: 15
      },
      keywords: ['외로움', '위안', '평화', '고요함', '별'],
      patternChanges: null
    }

    await env.DB.prepare(`
      INSERT INTO ai_analyses (id, post_id, user_id, core_values, emotion_tone, keywords, pattern_changes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      analysisId,
      postId,
      userId,
      JSON.stringify(analysis.coreValues),
      JSON.stringify(analysis.emotionTone),
      JSON.stringify(analysis.keywords),
      analysis.patternChanges
    ).run()

    return c.json({ success: true, data: analysis })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to analyze' }, 500)
  }
})

// 6. 편지 관련 API
app.post('/api/letters', async (c) => {
  const { env } = c
  const body = await c.req.json()
  const { 
    fromUserId, 
    toUserId, 
    postId, 
    subject, 
    content,
    fromLat,
    fromLng,
    toLat,
    toLng,
    distanceKm,
    flightDurationSec,
    emotionIds 
  } = body

  if (!fromUserId || !toUserId || !subject || !content) {
    return c.json({ success: false, error: 'Missing required fields' }, 400)
  }

  try {
    const letterId = `letter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    await env.DB.prepare(`
      INSERT INTO letters (
        id, from_user_id, to_user_id, post_id, subject, content,
        from_latitude, from_longitude, to_latitude, to_longitude,
        distance_km, flight_duration_sec
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      letterId, fromUserId, toUserId, postId, subject, content,
      fromLat, fromLng, toLat, toLng, distanceKm, flightDurationSec
    ).run()

    // 감정 키워드 연결
    if (emotionIds && emotionIds.length > 0) {
      for (const emotionId of emotionIds) {
        const leId = `le-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        await env.DB.prepare(`
          INSERT INTO letter_emotions (id, letter_id, emotion_id)
          VALUES (?, ?, ?)
        `).bind(leId, letterId, emotionId).run()
      }
    }

    return c.json({ success: true, data: { id: letterId } })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to send letter' }, 500)
  }
})

app.get('/api/letters/inbox', async (c) => {
  const { env } = c
  const userId = c.req.query('userId')

  if (!userId) {
    return c.json({ success: false, error: 'Missing userId' }, 400)
  }

  try {
    const result = await env.DB.prepare(`
      SELECT 
        l.*,
        u_from.nickname as from_nickname,
        u_from.character as from_character,
        u_to.nickname as to_nickname,
        u_to.character as to_character,
        GROUP_CONCAT(ek.id || ':' || ek.name || ':' || ek.type || ':' || ek.color) as emotions
      FROM letters l
      JOIN users u_from ON l.from_user_id = u_from.id
      JOIN users u_to ON l.to_user_id = u_to.id
      LEFT JOIN letter_emotions le ON l.id = le.letter_id
      LEFT JOIN emotion_keywords ek ON le.emotion_id = ek.id
      WHERE l.to_user_id = ?
      GROUP BY l.id
      ORDER BY l.created_at DESC
    `).bind(userId).all()

    const letters = result.results.map((row: any) => ({
      id: row.id,
      from: {
        id: row.from_user_id,
        nickname: row.from_nickname,
        character: row.from_character
      },
      to: {
        id: row.to_user_id,
        nickname: row.to_nickname,
        character: row.to_character
      },
      subject: row.subject,
      content: row.content,
      emotionKeywords: row.emotions ? row.emotions.split(',').map((e: string) => {
        const [id, name, type, color] = e.split(':')
        return { id, name, type, color }
      }) : [],
      isRead: row.is_read === 1,
      isReplied: row.is_replied === 1,
      createdAt: row.created_at,
      readAt: row.read_at
    }))

    return c.json({ success: true, data: letters })
  } catch (error) {
    return c.json({ success: false, error: 'Failed to fetch inbox' }, 500)
  }
})

// ======================
// HTML 페이지 라우트
// ======================

// 공통 HTML 레이아웃
const layout = (title: string, content: string) => {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="글로 마음을 정리하고, 비슷한 영혼과 느리게 이어지는 감정 커뮤니티">
  <title>${title} - HeartKemy</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Nanum+Pen+Script&family=Noto+Sans+KR:wght@300;400;500;700&display=swap" rel="stylesheet">
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            primary: '#9370DB',
            accent: '#FFD700',
            'text-main': '#2D3748',
            'text-sub': '#718096',
            'emotion-warm': '#FFA500',
            'emotion-comfort': '#87CEEB',
            'emotion-excitement': '#9370DB',
            'emotion-solitude': '#A9A9A9',
            'emotion-sincerity': '#FFD700'
          },
          fontFamily: {
            'nanum-pen': ['"Nanum Pen Script"', 'cursive'],
            'noto': ['"Noto Sans KR"', 'sans-serif']
          }
        }
      }
    }
  </script>
  <style>
    body {
      font-family: 'Noto Sans KR', sans-serif;
      background: linear-gradient(135deg, #f5f7fa 0%, #e8eef5 100%);
    }
    .handwriting {
      font-family: 'Nanum Pen Script', cursive;
    }
  </style>
</head>
<body class="min-h-screen">
  <!-- 네비게이션 -->
  <nav class="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <a href="/" class="text-2xl font-bold text-primary handwriting">💜 HeartKemy</a>
        <div class="flex space-x-6">
          <a href="/" class="text-text-sub hover:text-primary transition">홈</a>
          <a href="/map" class="text-text-sub hover:text-primary transition">감성지도</a>
          <a href="/write" class="text-text-sub hover:text-primary transition">글쓰기</a>
          <a href="/explore" class="text-text-sub hover:text-primary transition">소울탐색</a>
          <a href="/letters" class="text-text-sub hover:text-primary transition">편지함</a>
        </div>
      </div>
    </div>
  </nav>

  <!-- 메인 컨텐츠 -->
  <main>
    ${content}
  </main>

  <!-- 푸터 -->
  <footer class="bg-white/80 backdrop-blur-sm mt-16 py-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-text-sub">
      <p class="text-sm">진심을 나누는 글 한 줄로, 나를 먼저 이해하고 소울메이트를 발견하는 공간</p>
      <p class="text-xs mt-2">© 2026 HeartKemy. All rights reserved.</p>
    </div>
  </footer>
</body>
</html>`
}

// 홈 페이지
app.get('/', (c) => {
  const content = `
    <div class="max-w-4xl mx-auto px-4 py-12">
      <!-- 히어로 섹션 -->
      <div class="text-center mb-16">
        <h1 class="text-5xl font-bold text-primary mb-4 handwriting">💜 HeartKemy</h1>
        <p class="text-xl text-text-sub mb-8">글로 마음을 정리하고, 비슷한 영혼과 느리게 이어지는 감정 커뮤니티</p>
        <div class="flex justify-center space-x-4">
          <a href="/write" class="bg-primary text-white px-8 py-3 rounded-full hover:bg-purple-600 transition shadow-lg">
            ✍️ 오늘의 마음 쓰기
          </a>
          <a href="/map" class="bg-white text-primary px-8 py-3 rounded-full hover:bg-gray-50 transition shadow-lg border-2 border-primary">
            🗺️ 감성지도 보기
          </a>
        </div>
      </div>

      <!-- 대시보드 카드 -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div class="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
          <div class="text-3xl mb-2">📝</div>
          <h3 class="text-lg font-semibold text-text-main mb-2">이번 주 글쓰기</h3>
          <p class="text-3xl font-bold text-primary">4일</p>
          <p class="text-sm text-text-sub mt-1">목표: 주 5일</p>
        </div>

        <div class="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
          <div class="text-3xl mb-2">💌</div>
          <h3 class="text-lg font-semibold text-text-main mb-2">새 편지</h3>
          <p class="text-3xl font-bold text-primary">3통</p>
          <p class="text-sm text-text-sub mt-1">답장 대기 중</p>
        </div>

        <div class="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
          <div class="text-3xl mb-2">❤️</div>
          <h3 class="text-lg font-semibold text-text-main mb-2">공감 받은 글</h3>
          <p class="text-3xl font-bold text-primary">12개</p>
          <p class="text-sm text-text-sub mt-1">이번 주</p>
        </div>
      </div>

      <!-- 오늘의 질문 -->
      <div class="bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl p-8 shadow-lg mb-12">
        <h2 class="text-2xl font-bold text-text-main mb-4 handwriting">💭 오늘의 질문</h2>
        <p class="text-lg text-text-main mb-6 leading-relaxed">
          "오늘 당신의 마음을 가장 잘 표현하는 단어 세 개는 무엇인가요?"
        </p>
        <a href="/write" class="inline-block bg-white text-primary px-6 py-3 rounded-full hover:shadow-lg transition">
          답변 쓰러 가기 →
        </a>
      </div>

      <!-- 최근 감정 분석 -->
      <div class="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg">
        <h2 class="text-2xl font-bold text-text-main mb-6 handwriting">📊 최근 감정 패턴</h2>
        <div class="grid grid-cols-5 gap-4">
          <div class="text-center">
            <div class="w-16 h-16 mx-auto mb-2 rounded-full bg-emotion-warm/20 flex items-center justify-center">
              <span class="text-2xl">🔥</span>
            </div>
            <p class="text-sm text-text-sub">따뜻함</p>
            <p class="text-lg font-bold text-emotion-warm">20%</p>
          </div>
          <div class="text-center">
            <div class="w-16 h-16 mx-auto mb-2 rounded-full bg-emotion-comfort/20 flex items-center justify-center">
              <span class="text-2xl">🌊</span>
            </div>
            <p class="text-sm text-text-sub">위로</p>
            <p class="text-lg font-bold text-emotion-comfort">30%</p>
          </div>
          <div class="text-center">
            <div class="w-16 h-16 mx-auto mb-2 rounded-full bg-emotion-excitement/20 flex items-center justify-center">
              <span class="text-2xl">✨</span>
            </div>
            <p class="text-sm text-text-sub">설렘</p>
            <p class="text-lg font-bold text-emotion-excitement">10%</p>
          </div>
          <div class="text-center">
            <div class="w-16 h-16 mx-auto mb-2 rounded-full bg-emotion-solitude/20 flex items-center justify-center">
              <span class="text-2xl">🌙</span>
            </div>
            <p class="text-sm text-text-sub">고독</p>
            <p class="text-lg font-bold text-emotion-solitude">25%</p>
          </div>
          <div class="text-center">
            <div class="w-16 h-16 mx-auto mb-2 rounded-full bg-emotion-sincerity/20 flex items-center justify-center">
              <span class="text-2xl">💛</span>
            </div>
            <p class="text-sm text-text-sub">진심</p>
            <p class="text-lg font-bold text-emotion-sincerity">15%</p>
          </div>
        </div>
      </div>
    </div>
  `
  
  return c.html(layout('홈', content))
})

export default app
