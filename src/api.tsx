import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

type Bindings = {
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  GOOGLE_MAPS_API_KEY?: string
  OPENAI_API_KEY?: string
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS 활성화
app.use('/api/*', cors())

// 정적 파일 제공
app.use('/static/*', serveStatic({ root: './public' }))

// Supabase 클라이언트 생성 미들웨어
app.use('*', async (c, next) => {
  const supabaseUrl = c.env.SUPABASE_URL || 'https://placeholder.supabase.co'
  const supabaseKey = c.env.SUPABASE_ANON_KEY || 'placeholder-key'
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  c.set('supabase', supabase)
  
  await next()
})

// ======================
// API 라우트
// ======================

// 1. 사용자 관련 API
app.get('/api/users/me', async (c) => {
  const supabase = c.get('supabase') as SupabaseClient
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return c.json({ success: false, error: 'Not authenticated' }, 401)
    }

    // users 테이블에서 추가 정보 가져오기
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (userError && userError.code !== 'PGRST116') {
      console.error('User fetch error:', userError)
    }

    return c.json({
      success: true,
      data: userData || {
        id: user.id,
        email: user.email,
        nickname: user.user_metadata?.nickname || '익명',
        character: user.user_metadata?.character || '💫'
      }
    })
  } catch (error) {
    console.error('Auth error:', error)
    return c.json({ success: false, error: 'Authentication failed' }, 500)
  }
})

// 2. 글(포스트) 관련 API
app.get('/api/posts', async (c) => {
  const supabase = c.get('supabase') as SupabaseClient
  const limit = parseInt(c.req.query('limit') || '50')
  
  try {
    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        *,
        users!inner(id, nickname, character),
        post_emotions(
          emotion_keywords(id, name, type, color)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Posts fetch error:', error)
      return c.json({ success: false, error: 'Failed to fetch posts' }, 500)
    }

    const formattedPosts = posts.map((post: any) => ({
      id: post.id,
      author: {
        id: post.users.id,
        nickname: post.users.nickname,
        character: post.users.character
      },
      content: post.content,
      preview: post.preview,
      location: {
        lat: post.latitude,
        lng: post.longitude
      },
      emotionKeywords: post.post_emotions.map((pe: any) => pe.emotion_keywords).filter(Boolean),
      likes: post.likes,
      isLiked: false, // TODO: 현재 사용자의 좋아요 상태 확인
      createdAt: post.created_at
    }))

    return c.json({ success: true, data: formattedPosts })
  } catch (error) {
    console.error('Unexpected error:', error)
    return c.json({ success: false, error: 'Failed to fetch posts' }, 500)
  }
})

app.post('/api/posts', async (c) => {
  const supabase = c.get('supabase') as SupabaseClient
  const body = await c.req.json()
  const { userId, content, preview, latitude, longitude, emotionIds } = body

  if (!userId || !content || !preview || !latitude || !longitude) {
    return c.json({ success: false, error: 'Missing required fields' }, 400)
  }

  try {
    // 포스트 생성
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        user_id: userId,
        content,
        preview,
        latitude,
        longitude
      })
      .select()
      .single()

    if (postError) {
      console.error('Post creation error:', postError)
      return c.json({ success: false, error: 'Failed to create post' }, 500)
    }

    // 감정 키워드 연결
    if (emotionIds && emotionIds.length > 0) {
      const emotionLinks = emotionIds.map((emotionId: string) => ({
        post_id: post.id,
        emotion_id: emotionId
      }))

      const { error: emotionError } = await supabase
        .from('post_emotions')
        .insert(emotionLinks)

      if (emotionError) {
        console.error('Emotion link error:', emotionError)
      }
    }

    return c.json({ success: true, data: { id: post.id } })
  } catch (error) {
    console.error('Unexpected error:', error)
    return c.json({ success: false, error: 'Failed to create post' }, 500)
  }
})

// 포스트 위치 업데이트
app.patch('/api/posts/:id/location', async (c) => {
  const supabase = c.get('supabase') as SupabaseClient
  const postId = c.req.param('id')
  const body = await c.req.json()
  const { latitude, longitude } = body

  if (!latitude || !longitude) {
    return c.json({ success: false, error: 'Missing location data' }, 400)
  }

  try {
    const { error } = await supabase
      .from('posts')
      .update({ latitude, longitude })
      .eq('id', postId)

    if (error) {
      console.error('Location update error:', error)
      return c.json({ success: false, error: 'Failed to update location' }, 500)
    }

    return c.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return c.json({ success: false, error: 'Failed to update location' }, 500)
  }
})

// 3. 좋아요 API
app.post('/api/posts/:id/like', async (c) => {
  const supabase = c.get('supabase') as SupabaseClient
  const postId = c.req.param('id')
  const body = await c.req.json()
  const { userId } = body

  if (!userId) {
    return c.json({ success: false, error: 'Missing userId' }, 400)
  }

  try {
    // 좋아요 추가
    const { error: likeError } = await supabase
      .from('likes')
      .insert({ user_id: userId, post_id: postId })

    if (likeError && likeError.code !== '23505') { // Ignore duplicate key error
      console.error('Like error:', likeError)
      return c.json({ success: false, error: 'Failed to like post' }, 500)
    }

    // 포스트 좋아요 수 증가
    const { error: updateError } = await supabase.rpc('increment_post_likes', { post_id: postId })

    if (updateError) {
      console.error('Likes count update error:', updateError)
    }

    return c.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return c.json({ success: false, error: 'Failed to like post' }, 500)
  }
})

// 4. 감정 키워드 API
app.get('/api/emotions', async (c) => {
  const supabase = c.get('supabase') as SupabaseClient
  
  try {
    const { data: emotions, error } = await supabase
      .from('emotion_keywords')
      .select('*')
      .order('type')
      .order('name')

    if (error) {
      console.error('Emotions fetch error:', error)
      return c.json({ success: false, error: 'Failed to fetch emotions' }, 500)
    }

    return c.json({ success: true, data: emotions })
  } catch (error) {
    console.error('Unexpected error:', error)
    return c.json({ success: false, error: 'Failed to fetch emotions' }, 500)
  }
})

// 5. AI 분석 API
app.post('/api/analysis', async (c) => {
  const supabase = c.get('supabase') as SupabaseClient
  const body = await c.req.json()
  const { postId, userId, content } = body

  if (!postId || !userId || !content) {
    return c.json({ success: false, error: 'Missing required fields' }, 400)
  }

  try {
    // TODO: OpenAI GPT-4 호출 (현재는 더미 데이터)
    const analysis = {
      core_values: ['진정성', '공감', '자기이해'],
      emotion_tone: {
        warm: 20,
        comfort: 30,
        excitement: 10,
        solitude: 25,
        sincerity: 15
      },
      keywords: ['외로움', '위안', '평화', '고요함', '별'],
      pattern_changes: null
    }

    const { data, error } = await supabase
      .from('ai_analyses')
      .insert({
        post_id: postId,
        user_id: userId,
        core_values: analysis.core_values,
        emotion_tone: analysis.emotion_tone,
        keywords: analysis.keywords,
        pattern_changes: analysis.pattern_changes
      })
      .select()
      .single()

    if (error) {
      console.error('Analysis creation error:', error)
      return c.json({ success: false, error: 'Failed to create analysis' }, 500)
    }

    return c.json({ success: true, data: analysis })
  } catch (error) {
    console.error('Unexpected error:', error)
    return c.json({ success: false, error: 'Failed to analyze' }, 500)
  }
})

// 6. 편지 관련 API
app.post('/api/letters', async (c) => {
  const supabase = c.get('supabase') as SupabaseClient
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
    const { data: letter, error: letterError } = await supabase
      .from('letters')
      .insert({
        from_user_id: fromUserId,
        to_user_id: toUserId,
        post_id: postId,
        subject,
        content,
        from_latitude: fromLat,
        from_longitude: fromLng,
        to_latitude: toLat,
        to_longitude: toLng,
        distance_km: distanceKm,
        flight_duration_sec: flightDurationSec
      })
      .select()
      .single()

    if (letterError) {
      console.error('Letter creation error:', letterError)
      return c.json({ success: false, error: 'Failed to send letter' }, 500)
    }

    // 감정 키워드 연결
    if (emotionIds && emotionIds.length > 0) {
      const emotionLinks = emotionIds.map((emotionId: string) => ({
        letter_id: letter.id,
        emotion_id: emotionId
      }))

      const { error: emotionError } = await supabase
        .from('letter_emotions')
        .insert(emotionLinks)

      if (emotionError) {
        console.error('Letter emotion link error:', emotionError)
      }
    }

    return c.json({ success: true, data: { id: letter.id } })
  } catch (error) {
    console.error('Unexpected error:', error)
    return c.json({ success: false, error: 'Failed to send letter' }, 500)
  }
})

app.get('/api/letters/inbox', async (c) => {
  const supabase = c.get('supabase') as SupabaseClient
  const userId = c.req.query('userId')

  if (!userId) {
    return c.json({ success: false, error: 'Missing userId' }, 400)
  }

  try {
    const { data: letters, error } = await supabase
      .from('letters')
      .select(`
        *,
        from_user:users!letters_from_user_id_fkey(id, nickname, character),
        to_user:users!letters_to_user_id_fkey(id, nickname, character),
        letter_emotions(
          emotion_keywords(id, name, type, color)
        )
      `)
      .eq('to_user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Inbox fetch error:', error)
      return c.json({ success: false, error: 'Failed to fetch inbox' }, 500)
    }

    const formattedLetters = letters.map((letter: any) => ({
      id: letter.id,
      from: {
        id: letter.from_user.id,
        nickname: letter.from_user.nickname,
        character: letter.from_user.character
      },
      to: {
        id: letter.to_user.id,
        nickname: letter.to_user.nickname,
        character: letter.to_user.character
      },
      subject: letter.subject,
      content: letter.content,
      emotionKeywords: letter.letter_emotions.map((le: any) => le.emotion_keywords).filter(Boolean),
      isRead: letter.is_read,
      isReplied: letter.is_replied,
      createdAt: letter.created_at,
      readAt: letter.read_at
    }))

    return c.json({ success: true, data: formattedLetters })
  } catch (error) {
    console.error('Unexpected error:', error)
    return c.json({ success: false, error: 'Failed to fetch inbox' }, 500)
  }
})

// 7. 인증 API
app.post('/api/auth/google', async (c) => {
  const supabase = c.get('supabase') as SupabaseClient
  
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${c.req.url.split('/api')[0]}/`
      }
    })

    if (error) {
      console.error('OAuth error:', error)
      return c.json({ success: false, error: 'Authentication failed' }, 500)
    }

    return c.json({ success: true, data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return c.json({ success: false, error: 'Authentication failed' }, 500)
  }
})

app.post('/api/auth/signout', async (c) => {
  const supabase = c.get('supabase') as SupabaseClient
  
  try {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Sign out error:', error)
      return c.json({ success: false, error: 'Sign out failed' }, 500)
    }

    return c.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return c.json({ success: false, error: 'Sign out failed' }, 500)
  }
})

// ======================
// HTML 페이지 라우트는 이전과 동일
// ======================

export default app
