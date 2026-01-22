import { createClient } from '@supabase/supabase-js'

// Supabase 환경 변수
const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || ''

// Supabase 클라이언트 생성
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// 타입 정의
export type User = {
  id: string
  email: string
  nickname: string
  character: string
  profile_image?: string
  google_id?: string
  created_at: string
  updated_at: string
}

export type Post = {
  id: string
  user_id: string
  content: string
  preview: string
  latitude: number
  longitude: number
  likes: number
  created_at: string
  updated_at: string
}

export type EmotionKeyword = {
  id: string
  name: string
  type: 'warm' | 'comfort' | 'excitement' | 'solitude' | 'sincerity'
  color: string
  created_at: string
}

export type Letter = {
  id: string
  from_user_id: string
  to_user_id: string
  post_id?: string
  subject: string
  content: string
  is_read: boolean
  is_replied: boolean
  from_latitude: number
  from_longitude: number
  to_latitude: number
  to_longitude: number
  distance_km: number
  flight_duration_sec: number
  created_at: string
  read_at?: string
}
