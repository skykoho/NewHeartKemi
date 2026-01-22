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

// 글쓰기 페이지
app.get('/write', (c) => {
  const content = `
    <div class="max-w-3xl mx-auto px-4 py-12">
      <div class="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg">
        <h1 class="text-3xl font-bold text-primary mb-6 handwriting">✍️ 오늘의 마음 쓰기</h1>
        
        <!-- 오늘의 질문 -->
        <div class="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 mb-8">
          <h2 class="text-lg font-semibold text-text-main mb-3">💭 오늘의 질문</h2>
          <p id="todayQuestion" class="text-text-main leading-relaxed">
            "오늘 당신의 마음을 가장 잘 표현하는 단어 세 개는 무엇인가요?"
          </p>
        </div>

        <!-- 글쓰기 폼 -->
        <form id="writeForm" class="space-y-6">
          <!-- 텍스트 영역 -->
          <div>
            <label class="block text-sm font-medium text-text-main mb-2">
              마음을 자유롭게 표현해주세요 (최소 30자)
            </label>
            <textarea
              id="content"
              rows="10"
              class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none resize-none handwriting text-lg"
              placeholder="오늘 하루는 어땠나요? 지금 느끼는 감정을 편하게 적어보세요..."
            ></textarea>
            <div class="flex justify-between items-center mt-2">
              <p class="text-sm text-text-sub">
                <span id="charCount">0</span> / 최소 30자
              </p>
              <button type="button" id="generateQuestion" class="text-sm text-primary hover:underline">
                다른 질문 보기
              </button>
            </div>
          </div>

          <!-- 감정 키워드 선택 -->
          <div>
            <label class="block text-sm font-medium text-text-main mb-3">
              감정 키워드 선택 (최대 3개)
            </label>
            <div id="emotionKeywords" class="grid grid-cols-3 gap-3">
              <!-- 감정 키워드는 JavaScript로 로드 -->
            </div>
          </div>

          <!-- 위치 정보 -->
          <div class="bg-gray-50 rounded-xl p-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <span class="text-2xl">📍</span>
                <div>
                  <p class="text-sm font-medium text-text-main">현재 위치</p>
                  <p id="locationText" class="text-xs text-text-sub">위치 정보를 가져오는 중...</p>
                </div>
              </div>
              <button type="button" id="refreshLocation" class="text-sm text-primary hover:underline">
                새로고침
              </button>
            </div>
          </div>

          <!-- 제출 버튼 -->
          <div class="flex space-x-4">
            <button
              type="submit"
              class="flex-1 bg-primary text-white py-3 rounded-full hover:bg-purple-600 transition shadow-lg font-medium"
            >
              글 작성하기
            </button>
            <button
              type="button"
              onclick="window.location.href='/'"
              class="px-8 py-3 border-2 border-gray-300 text-text-sub rounded-full hover:bg-gray-50 transition"
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>

    <script>
      let selectedEmotions = [];
      let userLocation = null;

      // 오늘의 질문 목록
      const questions = [
        "오늘 당신의 마음을 가장 잘 표현하는 단어 세 개는 무엇인가요?",
        "지금 이 순간 가장 하고 싶은 말은 무엇인가요?",
        "오늘 하루를 색깔로 표현한다면 어떤 색일까요? 그리고 그 이유는?",
        "최근에 당신에게 위안이 되었던 순간은 언제였나요?",
        "지금 가장 그리운 것은 무엇인가요?",
        "오늘 하루 중 가장 평화로웠던 순간을 떠올려보세요.",
        "당신의 마음이 지금 원하는 것은 무엇인가요?"
      ];

      // 랜덤 질문 생성
      function generateQuestion() {
        const question = questions[Math.floor(Math.random() * questions.length)];
        document.getElementById('todayQuestion').textContent = question;
      }

      // 감정 키워드 로드
      async function loadEmotions() {
        try {
          const response = await fetch('/api/emotions');
          const result = await response.json();
          
          if (result.success) {
            const container = document.getElementById('emotionKeywords');
            container.innerHTML = result.data.map(emotion => \`
              <button
                type="button"
                class="emotion-btn px-4 py-2 rounded-full border-2 transition-all"
                data-id="\${emotion.id}"
                data-type="\${emotion.type}"
                style="border-color: \${emotion.color}20; color: \${emotion.color}"
              >
                \${emotion.name}
              </button>
            \`).join('');

            // 감정 키워드 클릭 이벤트
            document.querySelectorAll('.emotion-btn').forEach(btn => {
              btn.addEventListener('click', function() {
                const emotionId = this.dataset.id;
                
                if (this.classList.contains('selected')) {
                  // 선택 해제
                  this.classList.remove('selected', 'font-bold');
                  this.style.backgroundColor = 'transparent';
                  selectedEmotions = selectedEmotions.filter(id => id !== emotionId);
                } else if (selectedEmotions.length < 3) {
                  // 선택
                  this.classList.add('selected', 'font-bold');
                  this.style.backgroundColor = this.style.borderColor;
                  selectedEmotions.push(emotionId);
                } else {
                  alert('최대 3개까지 선택 가능합니다.');
                }
              });
            });
          }
        } catch (error) {
          console.error('Failed to load emotions:', error);
        }
      }

      // 위치 정보 가져오기
      function getUserLocation() {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            position => {
              userLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              };
              document.getElementById('locationText').textContent = 
                \`위도: \${userLocation.latitude.toFixed(4)}, 경도: \${userLocation.longitude.toFixed(4)}\`;
            },
            error => {
              console.error('Location error:', error);
              // 서울 중심부로 기본 설정
              userLocation = { latitude: 37.5665, longitude: 126.9780 };
              document.getElementById('locationText').textContent = '기본 위치 (서울)';
            }
          );
        } else {
          userLocation = { latitude: 37.5665, longitude: 126.9780 };
          document.getElementById('locationText').textContent = '기본 위치 (서울)';
        }
      }

      // 글자 수 카운터
      document.getElementById('content').addEventListener('input', function() {
        document.getElementById('charCount').textContent = this.value.length;
      });

      // 질문 새로고침
      document.getElementById('generateQuestion').addEventListener('click', generateQuestion);

      // 위치 새로고침
      document.getElementById('refreshLocation').addEventListener('click', getUserLocation);

      // 폼 제출
      document.getElementById('writeForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const content = document.getElementById('content').value.trim();
        
        if (content.length < 30) {
          alert('최소 30자 이상 작성해주세요.');
          return;
        }

        if (selectedEmotions.length === 0) {
          alert('감정 키워드를 최소 1개 선택해주세요.');
          return;
        }

        if (!userLocation) {
          alert('위치 정보를 가져오는 중입니다. 잠시 후 다시 시도해주세요.');
          return;
        }

        try {
          // 사용자 정보 가져오기
          const userResponse = await fetch('/api/users/me');
          const userData = await userResponse.json();
          
          if (!userData.success) {
            alert('사용자 정보를 가져올 수 없습니다.');
            return;
          }

          // 글 작성 API 호출
          const preview = content.substring(0, 50);
          const response = await fetch('/api/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: userData.data.id,
              content,
              preview,
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
              emotionIds: selectedEmotions
            })
          });

          const result = await response.json();
          
          if (result.success) {
            // AI 분석 호출
            await fetch('/api/analysis', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                postId: result.data.id,
                userId: userData.data.id,
                content
              })
            });

            // 분석 페이지로 이동
            window.location.href = \`/analysis?postId=\${result.data.id}\`;
          } else {
            alert('글 작성에 실패했습니다.');
          }
        } catch (error) {
          console.error('Submit error:', error);
          alert('오류가 발생했습니다.');
        }
      });

      // 페이지 로드 시 초기화
      loadEmotions();
      getUserLocation();
    </script>
  `
  
  return c.html(layout('글쓰기', content))
})

// 감성 지도 페이지
app.get('/map', (c) => {
  const content = `
    <div class="h-screen flex flex-col">
      <!-- 필터 바 -->
      <div class="bg-white/90 backdrop-blur-sm shadow-sm p-4">
        <div class="max-w-7xl mx-auto flex items-center justify-between">
          <div class="flex space-x-4">
            <select id="emotionFilter" class="px-4 py-2 border-2 border-gray-200 rounded-full focus:border-primary focus:outline-none">
              <option value="">모든 감정</option>
              <option value="warm">따뜻함</option>
              <option value="comfort">위로</option>
              <option value="excitement">설렘</option>
              <option value="solitude">고독</option>
              <option value="sincerity">진심</option>
            </select>
            <button id="myLocation" class="px-6 py-2 bg-primary text-white rounded-full hover:bg-purple-600 transition">
              📍 내 위치로
            </button>
          </div>
          <div class="text-sm text-text-sub">
            총 <span id="postCount" class="font-bold text-primary">0</span>개의 마음
          </div>
        </div>
      </div>

      <!-- 지도 -->
      <div id="map" class="flex-1"></div>
    </div>

    <script src="https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY&libraries=places"></script>
    <script>
      let map;
      let markers = [];
      let posts = [];
      let userLocation = { lat: 37.5665, lng: 126.9780 };

      // 지도 초기화
      function initMap() {
        map = new google.maps.Map(document.getElementById('map'), {
          center: userLocation,
          zoom: 13,
          styles: [
            {
              elementType: 'geometry',
              stylers: [{ saturation: -100 }, { lightness: 20 }]
            },
            {
              featureType: 'road',
              elementType: 'geometry',
              stylers: [{ color: '#e0e0e0' }, { visibility: 'simplified' }]
            },
            {
              featureType: 'poi',
              stylers: [{ visibility: 'off' }]
            },
            {
              featureType: 'transit',
              stylers: [{ visibility: 'off' }]
            }
          ],
          disableDefaultUI: true,
          zoomControl: true
        });

        loadPosts();
      }

      // 포스트 로드
      async function loadPosts() {
        try {
          const response = await fetch('/api/posts?limit=100');
          const result = await response.json();
          
          if (result.success) {
            posts = result.data;
            document.getElementById('postCount').textContent = posts.length;
            renderMarkers();
          }
        } catch (error) {
          console.error('Failed to load posts:', error);
        }
      }

      // 마커 렌더링
      function renderMarkers() {
        // 기존 마커 제거
        markers.forEach(marker => marker.setMap(null));
        markers = [];

        const emotionFilter = document.getElementById('emotionFilter').value;

        posts.forEach(post => {
          // 필터 적용
          if (emotionFilter && !post.emotionKeywords.some(e => e.type === emotionFilter)) {
            return;
          }

          const isUserPost = post.author.id === 'user-demo-1';
          const emotionColor = post.emotionKeywords[0]?.color || '#9370DB';

          // 커스텀 마커 HTML
          const markerContent = \`
            <div style="
              position: relative;
              background: \${isUserPost ? '#FFD70020' : '#ffffff80'};
              backdrop-filter: blur(10px);
              border: 2px solid \${isUserPost ? '#FFD700' : '#e5e7eb'};
              border-radius: 12px;
              padding: 8px;
              max-width: 120px;
              cursor: pointer;
              transition: all 0.2s;
            " onmouseover="this.style.transform='translateY(-4px) scale(1.1)'; this.style.boxShadow='0 10px 20px rgba(0,0,0,0.2)'" onmouseout="this.style.transform='translateY(0) scale(1)'; this.style.boxShadow='0 4px 6px rgba(0,0,0,0.1)'">
              \${post.emotionKeywords[0] ? \`
                <div style="
                  display: inline-block;
                  background: \${emotionColor}40;
                  color: \${emotionColor};
                  padding: 2px 6px;
                  border-radius: 9999px;
                  font-size: 10px;
                  margin-bottom: 4px;
                ">\${post.emotionKeywords[0].name}</div>
              \` : ''}
              <div style="
                font-size: 11px;
                color: #2D3748;
                font-weight: 500;
                line-height: 1.3;
                margin-bottom: 4px;
              ">"\${post.preview.substring(0, 20)}..."</div>
              <div style="
                display: flex;
                align-items: center;
                justify-content: space-between;
              ">
                <div style="
                  width: 16px;
                  height: 16px;
                  border-radius: 50%;
                  background: \${isUserPost ? '#FFD700' : '#9370DB'};
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 8px;
                  color: white;
                ">\${post.author.nickname.charAt(0)}</div>
                <div style="
                  font-size: 10px;
                  color: #718096;
                ">❤️ \${post.likes}</div>
              </div>
              <div style="
                position: absolute;
                bottom: -4px;
                left: 50%;
                transform: translateX(-50%) rotate(45deg);
                width: 8px;
                height: 8px;
                background: \${isUserPost ? '#FFD70020' : '#ffffff80'};
                border-right: 2px solid \${isUserPost ? '#FFD700' : '#e5e7eb'};
                border-bottom: 2px solid \${isUserPost ? '#FFD700' : '#e5e7eb'};
              "></div>
            </div>
          \`;

          const marker = new google.maps.marker.AdvancedMarkerElement({
            map,
            position: post.location,
            content: new DOMParser().parseFromString(markerContent, 'text/html').body.firstChild,
          });

          marker.addListener('click', () => {
            showPostDetail(post);
          });

          markers.push(marker);
        });
      }

      // 포스트 상세 표시
      function showPostDetail(post) {
        const emotionTags = post.emotionKeywords.map(e => 
          \`<span style="background: \${e.color}40; color: \${e.color}; padding: 4px 12px; border-radius: 9999px; font-size: 12px;">\${e.name}</span>\`
        ).join(' ');

        const infoContent = \`
          <div style="max-width: 300px; padding: 16px;">
            <div style="margin-bottom: 12px;">\${emotionTags}</div>
            <p style="font-size: 14px; line-height: 1.6; color: #2D3748; margin-bottom: 12px;">"\${post.content}"</p>
            <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 12px; border-top: 1px solid #e5e7eb;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 20px;">\${post.author.character}</span>
                <span style="font-size: 14px; font-weight: 500;">\${post.author.nickname}</span>
              </div>
              <div style="display: flex; gap: 12px;">
                <button onclick="likePost('\${post.id}')" style="font-size: 12px; color: #9370DB;">❤️ \${post.likes}</button>
                <button onclick="sendLetter('\${post.id}')" style="font-size: 12px; color: #9370DB;">✉️ 편지</button>
              </div>
            </div>
          </div>
        \`;

        const infoWindow = new google.maps.InfoWindow({
          content: infoContent,
        });

        infoWindow.open(map, markers.find(m => m.position.lat === post.location.lat));
      }

      // 좋아요
      async function likePost(postId) {
        try {
          const userResponse = await fetch('/api/users/me');
          const userData = await userResponse.json();
          
          await fetch(\`/api/posts/\${postId}/like\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userData.data.id })
          });

          loadPosts();
        } catch (error) {
          console.error('Failed to like:', error);
        }
      }

      // 편지 보내기
      function sendLetter(postId) {
        const post = posts.find(p => p.id === postId);
        if (post) {
          window.location.href = \`/letters/compose?toUserId=\${post.author.id}&postId=\${postId}\`;
        }
      }

      // 사용자 위치로 이동
      document.getElementById('myLocation').addEventListener('click', () => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            position => {
              userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              };
              map.setCenter(userLocation);
              map.setZoom(16);
            },
            error => {
              alert('위치 정보를 가져올 수 없습니다.');
            }
          );
        }
      });

      // 필터 변경
      document.getElementById('emotionFilter').addEventListener('change', renderMarkers);

      // 지도 초기화
      initMap();
    </script>
  `
  
  return c.html(layout('감성지도', content))
})

// AI 분석 페이지
app.get('/analysis', (c) => {
  const postId = c.req.query('postId')
  
  const content = `
    <div class="max-w-4xl mx-auto px-4 py-12">
      <div class="text-center mb-12">
        <div class="inline-block animate-pulse mb-4">
          <span class="text-6xl">🔮</span>
        </div>
        <h1 class="text-3xl font-bold text-primary mb-4 handwriting">AI가 분석한 당신의 마음</h1>
        <p class="text-text-sub">방금 작성한 글에서 발견한 감정과 패턴을 분석했어요</p>
      </div>

      <div id="analysisContent" class="space-y-8">
        <div class="text-center py-12">
          <div class="animate-spin inline-block w-12 h-12 border-4 border-primary border-t-transparent rounded-full"></div>
          <p class="mt-4 text-text-sub">분석 중...</p>
        </div>
      </div>

      <div class="flex justify-center space-x-4 mt-12">
        <a href="/map" class="bg-primary text-white px-8 py-3 rounded-full hover:bg-purple-600 transition shadow-lg">
          감성지도 보기
        </a>
        <a href="/" class="bg-white text-primary px-8 py-3 rounded-full hover:bg-gray-50 transition shadow-lg border-2 border-primary">
          홈으로
        </a>
      </div>
    </div>

    <script>
      const postId = '${postId}';

      async function loadAnalysis() {
        try {
          // 실제로는 DB에서 분석 결과 가져오기
          // 지금은 더미 데이터 표시
          setTimeout(() => {
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
              insights: '당신은 혼자만의 시간을 소중히 여기며, 그 안에서 평화를 찾는 사람입니다. 외로움을 부정적으로만 보지 않고, 고요함 속에서 자신을 돌아보는 시간으로 받아들이는 성향이 보입니다.'
            };

            const html = \`
              <!-- 핵심 가치관 -->
              <div class="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 shadow-lg">
                <h2 class="text-2xl font-bold text-text-main mb-6 handwriting">💎 핵심 가치관</h2>
                <div class="flex flex-wrap gap-3">
                  \${analysis.coreValues.map(value => \`
                    <span class="px-6 py-3 bg-white rounded-full text-primary font-semibold shadow-md">\${value}</span>
                  \`).join('')}
                </div>
              </div>

              <!-- 감정 톤 분석 -->
              <div class="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg">
                <h2 class="text-2xl font-bold text-text-main mb-6 handwriting">🎨 감정 톤 분석</h2>
                <div class="space-y-4">
                  <div>
                    <div class="flex justify-between mb-2">
                      <span class="text-sm font-medium">🔥 따뜻함</span>
                      <span class="text-sm font-bold text-emotion-warm">\${analysis.emotionTone.warm}%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-3">
                      <div class="bg-emotion-warm h-3 rounded-full transition-all" style="width: \${analysis.emotionTone.warm}%"></div>
                    </div>
                  </div>
                  <div>
                    <div class="flex justify-between mb-2">
                      <span class="text-sm font-medium">🌊 위로</span>
                      <span class="text-sm font-bold text-emotion-comfort">\${analysis.emotionTone.comfort}%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-3">
                      <div class="bg-emotion-comfort h-3 rounded-full transition-all" style="width: \${analysis.emotionTone.comfort}%"></div>
                    </div>
                  </div>
                  <div>
                    <div class="flex justify-between mb-2">
                      <span class="text-sm font-medium">✨ 설렘</span>
                      <span class="text-sm font-bold text-emotion-excitement">\${analysis.emotionTone.excitement}%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-3">
                      <div class="bg-emotion-excitement h-3 rounded-full transition-all" style="width: \${analysis.emotionTone.excitement}%"></div>
                    </div>
                  </div>
                  <div>
                    <div class="flex justify-between mb-2">
                      <span class="text-sm font-medium">🌙 고독</span>
                      <span class="text-sm font-bold text-emotion-solitude">\${analysis.emotionTone.solitude}%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-3">
                      <div class="bg-emotion-solitude h-3 rounded-full transition-all" style="width: \${analysis.emotionTone.solitude}%"></div>
                    </div>
                  </div>
                  <div>
                    <div class="flex justify-between mb-2">
                      <span class="text-sm font-medium">💛 진심</span>
                      <span class="text-sm font-bold text-emotion-sincerity">\${analysis.emotionTone.sincerity}%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-3">
                      <div class="bg-emotion-sincerity h-3 rounded-full transition-all" style="width: \${analysis.emotionTone.sincerity}%"></div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 키워드 -->
              <div class="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg">
                <h2 class="text-2xl font-bold text-text-main mb-6 handwriting">🏷️ 주요 키워드</h2>
                <div class="flex flex-wrap gap-3">
                  \${analysis.keywords.map(keyword => \`
                    <span class="px-4 py-2 bg-gray-100 rounded-full text-text-main">\${keyword}</span>
                  \`).join('')}
                </div>
              </div>

              <!-- AI 인사이트 -->
              <div class="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 shadow-lg">
                <h2 class="text-2xl font-bold text-text-main mb-6 handwriting">💡 AI 인사이트</h2>
                <p class="text-text-main leading-relaxed">
                  \${analysis.insights}
                </p>
              </div>
            \`;

            document.getElementById('analysisContent').innerHTML = html;
          }, 2000);
        } catch (error) {
          console.error('Failed to load analysis:', error);
        }
      }

      if (postId) {
        loadAnalysis();
      }
    </script>
  `
  
  return c.html(layout('AI 분석', content))
})

// 편지 작성 페이지
app.get('/letters/compose', (c) => {
  const toUserId = c.req.query('toUserId')
  const postId = c.req.query('postId')
  
  const content = `
    <div class="max-w-3xl mx-auto px-4 py-12">
      <div class="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-8 shadow-lg">
        <h1 class="text-3xl font-bold text-primary mb-6 handwriting">✉️ 편지 쓰기</h1>
        
        <form id="letterForm" class="space-y-6">
          <!-- 받는 사람 -->
          <div class="bg-white rounded-xl p-4">
            <label class="block text-sm font-medium text-text-main mb-2">받는 사람</label>
            <p id="recipientInfo" class="text-text-main">로딩 중...</p>
          </div>

          <!-- 제목 -->
          <div>
            <label class="block text-sm font-medium text-text-main mb-2">제목</label>
            <input
              type="text"
              id="subject"
              class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
              placeholder="편지 제목을 입력하세요"
            />
          </div>

          <!-- 내용 -->
          <div>
            <label class="block text-sm font-medium text-text-main mb-2">내용 (최소 20자)</label>
            <textarea
              id="content"
              rows="10"
              class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none resize-none handwriting text-lg"
              placeholder="진심을 담아 편지를 써보세요..."
            ></textarea>
            <p class="text-sm text-text-sub mt-2">
              <span id="charCount">0</span> / 최소 20자
            </p>
          </div>

          <!-- 감정 키워드 -->
          <div>
            <label class="block text-sm font-medium text-text-main mb-3">감정 키워드 (선택)</label>
            <div id="emotionKeywords" class="grid grid-cols-3 gap-3">
              <!-- JavaScript로 로드 -->
            </div>
          </div>

          <!-- 전송 정보 -->
          <div class="bg-purple-50 rounded-xl p-4">
            <div class="flex items-center space-x-3 mb-3">
              <span class="text-2xl">✈️</span>
              <div>
                <p class="text-sm font-medium text-text-main">종이비행기로 전송</p>
                <p class="text-xs text-text-sub">20km/h 속도로 상대방에게 날아갑니다</p>
              </div>
            </div>
            <div class="text-xs text-text-sub">
              예상 도착 시간: <span id="estimatedTime" class="font-bold">계산 중...</span>
            </div>
          </div>

          <!-- 제출 버튼 -->
          <div class="flex space-x-4">
            <button
              type="submit"
              class="flex-1 bg-primary text-white py-3 rounded-full hover:bg-purple-600 transition shadow-lg font-medium"
            >
              편지 보내기
            </button>
            <button
              type="button"
              onclick="window.history.back()"
              class="px-8 py-3 border-2 border-gray-300 text-text-sub rounded-full hover:bg-gray-50 transition"
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>

    <script>
      const toUserId = '${toUserId}';
      const postId = '${postId}';
      let selectedEmotions = [];
      let userLocation = null;
      let recipientLocation = null;

      // 위치 정보 가져오기
      function getUserLocation() {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            position => {
              userLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              };
              calculateFlightTime();
            },
            () => {
              userLocation = { latitude: 37.5665, longitude: 126.9780 };
              calculateFlightTime();
            }
          );
        }
      }

      // 비행 시간 계산 (Haversine formula)
      function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // 지구 반지름 (km)
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
      }

      function calculateFlightTime() {
        if (!userLocation || !recipientLocation) return;
        
        const distance = calculateDistance(
          userLocation.latitude, userLocation.longitude,
          recipientLocation.latitude, recipientLocation.longitude
        );
        
        const timeInHours = distance / 20; // 20km/h
        const minutes = Math.ceil(timeInHours * 60);
        
        document.getElementById('estimatedTime').textContent = 
          minutes < 60 ? \`약 \${minutes}분\` : \`약 \${Math.ceil(minutes/60)}시간 \${minutes%60}분\`;
      }

      // 감정 키워드 로드
      async function loadEmotions() {
        try {
          const response = await fetch('/api/emotions');
          const result = await response.json();
          
          if (result.success) {
            const container = document.getElementById('emotionKeywords');
            container.innerHTML = result.data.slice(0, 9).map(emotion => \`
              <button
                type="button"
                class="emotion-btn px-4 py-2 rounded-full border-2 transition-all"
                data-id="\${emotion.id}"
                style="border-color: \${emotion.color}20; color: \${emotion.color}"
              >
                \${emotion.name}
              </button>
            \`).join('');

            document.querySelectorAll('.emotion-btn').forEach(btn => {
              btn.addEventListener('click', function() {
                const emotionId = this.dataset.id;
                
                if (this.classList.contains('selected')) {
                  this.classList.remove('selected', 'font-bold');
                  this.style.backgroundColor = 'transparent';
                  selectedEmotions = selectedEmotions.filter(id => id !== emotionId);
                } else if (selectedEmotions.length < 3) {
                  this.classList.add('selected', 'font-bold');
                  this.style.backgroundColor = this.style.borderColor;
                  selectedEmotions.push(emotionId);
                }
              });
            });
          }
        } catch (error) {
          console.error('Failed to load emotions:', error);
        }
      }

      // 글자 수 카운터
      document.getElementById('content').addEventListener('input', function() {
        document.getElementById('charCount').textContent = this.value.length;
      });

      // 폼 제출
      document.getElementById('letterForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const subject = document.getElementById('subject').value.trim();
        const content = document.getElementById('content').value.trim();
        
        if (!subject) {
          alert('제목을 입력해주세요.');
          return;
        }

        if (content.length < 20) {
          alert('최소 20자 이상 작성해주세요.');
          return;
        }

        try {
          const userResponse = await fetch('/api/users/me');
          const userData = await userResponse.json();
          
          const distance = calculateDistance(
            userLocation.latitude, userLocation.longitude,
            recipientLocation.latitude, recipientLocation.longitude
          );
          const durationSec = (distance / 20) * 3600;

          const response = await fetch('/api/letters', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fromUserId: userData.data.id,
              toUserId,
              postId,
              subject,
              content,
              fromLat: userLocation.latitude,
              fromLng: userLocation.longitude,
              toLat: recipientLocation.latitude,
              toLng: recipientLocation.longitude,
              distanceKm: distance,
              flightDurationSec: durationSec,
              emotionIds: selectedEmotions
            })
          });

          const result = await response.json();
          
          if (result.success) {
            alert('편지가 전송되었습니다! 종이비행기가 날아갑니다 ✈️');
            window.location.href = '/map';
          } else {
            alert('편지 전송에 실패했습니다.');
          }
        } catch (error) {
          console.error('Submit error:', error);
          alert('오류가 발생했습니다.');
        }
      });

      // 페이지 로드 시 초기화
      async function init() {
        // 받는 사람 정보 로드 (더미)
        document.getElementById('recipientInfo').textContent = '💫 감성민지님에게';
        recipientLocation = { latitude: 37.5700, longitude: 126.9850 };
        
        loadEmotions();
        getUserLocation();
      }

      init();
    </script>
  `
  
  return c.html(layout('편지 쓰기', content))
})

// 편지함 페이지
app.get('/letters', (c) => {
  const content = `
    <div class="max-w-6xl mx-auto px-4 py-12">
      <h1 class="text-3xl font-bold text-primary mb-8 handwriting">💌 편지함</h1>

      <!-- 탭 -->
      <div class="flex border-b-2 border-gray-200 mb-8">
        <button id="tabInbox" class="tab-btn px-8 py-3 font-medium border-b-2 border-primary text-primary">
          받은 편지
        </button>
        <button id="tabSent" class="tab-btn px-8 py-3 font-medium text-text-sub hover:text-primary">
          보낸 편지
        </button>
      </div>

      <!-- 받은 편지 목록 -->
      <div id="inboxContent">
        <div class="text-center py-12">
          <div class="animate-spin inline-block w-12 h-12 border-4 border-primary border-t-transparent rounded-full"></div>
          <p class="mt-4 text-text-sub">로딩 중...</p>
        </div>
      </div>

      <!-- 보낸 편지 목록 -->
      <div id="sentContent" class="hidden">
        <div class="text-center py-12">
          <p class="text-text-sub">보낸 편지가 없습니다.</p>
        </div>
      </div>
    </div>

    <script>
      let currentTab = 'inbox';

      // 탭 전환
      document.getElementById('tabInbox').addEventListener('click', () => {
        currentTab = 'inbox';
        document.getElementById('tabInbox').classList.add('border-primary', 'text-primary');
        document.getElementById('tabInbox').classList.remove('text-text-sub');
        document.getElementById('tabSent').classList.remove('border-primary', 'text-primary');
        document.getElementById('tabSent').classList.add('text-text-sub');
        document.getElementById('inboxContent').classList.remove('hidden');
        document.getElementById('sentContent').classList.add('hidden');
      });

      document.getElementById('tabSent').addEventListener('click', () => {
        currentTab = 'sent';
        document.getElementById('tabSent').classList.add('border-primary', 'text-primary');
        document.getElementById('tabSent').classList.remove('text-text-sub');
        document.getElementById('tabInbox').classList.remove('border-primary', 'text-primary');
        document.getElementById('tabInbox').classList.add('text-text-sub');
        document.getElementById('sentContent').classList.remove('hidden');
        document.getElementById('inboxContent').classList.add('hidden');
      });

      // 받은 편지 로드
      async function loadInbox() {
        try {
          const userResponse = await fetch('/api/users/me');
          const userData = await userResponse.json();
          
          const response = await fetch(\`/api/letters/inbox?userId=\${userData.data.id}\`);
          const result = await response.json();
          
          if (result.success && result.data.length > 0) {
            const html = result.data.map(letter => \`
              <div class="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition cursor-pointer \${!letter.isRead ? 'border-2 border-primary' : ''}"
                   onclick="viewLetter('\${letter.id}')">
                <div class="flex items-start justify-between mb-4">
                  <div class="flex items-center space-x-3">
                    <span class="text-3xl">\${letter.from.character}</span>
                    <div>
                      <p class="font-semibold text-text-main">\${letter.from.nickname}</p>
                      <p class="text-xs text-text-sub">\${new Date(letter.createdAt).toLocaleDateString('ko-KR')}</p>
                    </div>
                  </div>
                  \${!letter.isRead ? '<span class="px-3 py-1 bg-primary text-white text-xs rounded-full">새 편지</span>' : ''}
                </div>
                <h3 class="font-bold text-text-main mb-2">\${letter.subject}</h3>
                <p class="text-text-sub text-sm line-clamp-2">\${letter.content}</p>
                \${letter.emotionKeywords.length > 0 ? \`
                  <div class="flex flex-wrap gap-2 mt-4">
                    \${letter.emotionKeywords.map(e => \`
                      <span class="text-xs px-2 py-1 rounded-full" style="background: \${e.color}40; color: \${e.color}">\${e.name}</span>
                    \`).join('')}
                  </div>
                \` : ''}
              </div>
            \`).join('');

            document.getElementById('inboxContent').innerHTML = \`
              <div class="grid grid-cols-1 gap-4">\${html}</div>
            \`;
          } else {
            document.getElementById('inboxContent').innerHTML = \`
              <div class="text-center py-12">
                <span class="text-6xl mb-4 block">📭</span>
                <p class="text-text-sub">받은 편지가 없습니다.</p>
              </div>
            \`;
          }
        } catch (error) {
          console.error('Failed to load inbox:', error);
        }
      }

      function viewLetter(letterId) {
        alert('편지 상세 보기 기능은 구현 예정입니다.');
      }

      loadInbox();
    </script>
  `
  
  return c.html(layout('편지함', content))
})

export default app
