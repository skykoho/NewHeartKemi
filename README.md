# 💜 HeartKemy

> 글로 마음을 정리하고, 비슷한 영혼과 느리게 이어지는 감정 커뮤니티

## 📖 프로젝트 개요

**HeartKemy**는 진정성을 바탕으로 자신의 감정을 글로 표현하고, AI 분석을 통해 자기 이해를 높이며, 비슷한 감성을 가진 사람들과 편지로 소통하는 감정 기반 커뮤니티 웹 애플리케이션입니다.

### 핵심 가치

- **진정성 (Authenticity)**: 일상을 미화하지 않고 솔직한 감정 표현
- **자기 이해 (Self-Discovery)**: AI 기반 감정·가치관 분석
- **느린 연결 (Slow Connection)**: 편지 중심의 비동기 소통
- **감성적 경험 (Emotional Experience)**: 따뜻한 디자인과 UX

## 🚀 구현된 핵심 기능

1. **홈/대시보드** - 감정 통계 및 빠른 액션
2. **글쓰기** - AI 질문 생성, 감정 키워드 선택, 위치 수집
3. **AI 분석** - 감정 톤 분석, 핵심 가치관 추출
4. **감성 지도** - Google Maps, 말풍선 마커, 필터링
5. **편지 시스템** - 편지 작성, 비행 시간 계산, 편지함
6. **PWA** - Service Worker, 오프라인 지원
7. **인증** - Supabase Auth (Google OAuth)

## 🛠 기술 스택

### Frontend
- **Vanilla JavaScript** - 순수 자바스크립트
- **TailwindCSS** - 유틸리티 기반 CSS 프레임워크
- **Google Maps JavaScript API** - 지도 기능
- **PWA** - Progressive Web App

### Backend & Database
- **Hono** - 경량 웹 프레임워크
- **Supabase** - PostgreSQL 기반 Backend-as-a-Service
  - PostgreSQL Database
  - Authentication (Google OAuth)
  - Row Level Security (RLS)
  - Real-time subscriptions

### Development
- **TypeScript** - 타입 안전성
- **Vite** - 빌드 도구
- **Vercel** - 배포 플랫폼

## 📁 프로젝트 구조

```
heartkemy/
├── src/
│   ├── index.tsx           # 메인 애플리케이션 (HTML 라우트)
│   ├── api.tsx             # Supabase API 라우트
│   └── lib/
│       └── supabase.ts     # Supabase 클라이언트
├── public/
│   └── static/
│       ├── manifest.json   # PWA 매니페스트
│       ├── sw.js           # Service Worker
│       └── style.css       # 커스텀 스타일
├── supabase/
│   ├── schema.sql          # PostgreSQL 스키마
│   └── seed.sql            # 시드 데이터
├── .env.example            # 환경 변수 예시
├── package.json
└── README.md
```

## 🚦 Supabase 설정

### 1. Supabase 프로젝트 생성

1. https://supabase.com 접속
2. "New Project" 클릭
3. 프로젝트 이름, 데이터베이스 비밀번호 설정
4. 리전 선택 (Northeast Asia - Seoul 권장)

### 2. 데이터베이스 스키마 생성

Supabase 대시보드에서:
1. SQL Editor 열기
2. `supabase/schema.sql` 파일 내용 복사
3. 실행하여 테이블 생성

### 3. 시드 데이터 삽입

SQL Editor에서:
1. `supabase/seed.sql` 파일 내용 복사
2. 실행하여 기본 감정 키워드 삽입

### 4. Google OAuth 설정

Supabase 대시보드 > Authentication > Providers:
1. Google 활성화
2. Google Cloud Console에서 OAuth 2.0 클라이언트 ID 생성
3. Authorized redirect URIs에 Supabase 콜백 URL 추가:
   ```
   https://[your-project-ref].supabase.co/auth/v1/callback
   ```
4. Client ID와 Client Secret을 Supabase에 입력

### 5. 환경 변수 설정

`.env` 파일 생성:
```bash
cp .env.example .env
```

`.env` 파일 편집:
```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
OPENAI_API_KEY=your-openai-api-key
```

Supabase 대시보드 > Settings > API에서 URL과 anon key 확인

## 🚦 로컬 개발 환경 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

위의 Supabase 설정 참고

### 3. 개발 서버 시작

```bash
npm run dev
```

### 4. 접속

- 로컬: `http://localhost:5173`

## 🌐 Vercel 배포

### 1. Vercel CLI 설치

```bash
npm install -g vercel
```

### 2. Vercel 로그인

```bash
vercel login
```

### 3. 환경 변수 설정

Vercel 대시보드에서:
1. Project Settings > Environment Variables
2. 다음 변수 추가:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `GOOGLE_MAPS_API_KEY` (선택)
   - `OPENAI_API_KEY` (선택)

### 4. 배포

```bash
npm run build
vercel --prod
```

또는 GitHub 연동으로 자동 배포:
1. GitHub 저장소와 Vercel 프로젝트 연결
2. main 브랜치에 push하면 자동 배포

## 📝 주요 API 엔드포인트

### 인증
- `GET /api/users/me` - 현재 사용자 정보
- `POST /api/auth/google` - Google OAuth 로그인
- `POST /api/auth/signout` - 로그아웃

### 포스트
- `GET /api/posts` - 포스트 목록
- `POST /api/posts` - 새 포스트 작성
- `PATCH /api/posts/:id/location` - 포스트 위치 업데이트
- `POST /api/posts/:id/like` - 좋아요

### 감정 키워드
- `GET /api/emotions` - 감정 키워드 목록

### AI 분석
- `POST /api/analysis` - AI 감정 분석

### 편지
- `POST /api/letters` - 편지 전송
- `GET /api/letters/inbox` - 받은 편지함

## 🔒 보안 (Row Level Security)

Supabase는 PostgreSQL의 Row Level Security(RLS)를 사용하여 데이터 보안을 보장합니다:

- **Users**: 모든 사용자 조회 가능, 본인만 수정 가능
- **Posts**: 모든 포스트 조회 가능, 본인만 수정/삭제 가능
- **Letters**: 발신자/수신자만 조회 가능
- **AI Analyses**: 본인 분석만 조회 가능
- **Likes**: 본인 좋아요만 관리 가능

## 🎨 디자인 시스템

### 컬러 팔레트
- **Primary**: `#9370DB` (Medium Purple)
- **Accent**: `#FFD700` (Gold)
- **Emotions**:
  - 따뜻함: `#FFA500`
  - 위로: `#87CEEB`
  - 설렘: `#9370DB`
  - 고독: `#A9A9A9`
  - 진심: `#FFD700`

### 폰트
- **본문**: Noto Sans KR
- **손글씨**: Nanum Pen Script

## 📈 다음 단계

1. ✅ Supabase 설정 및 연동
2. ✅ Google OAuth 인증 구현
3. ⏳ OpenAI GPT-4 실제 연동
4. ⏳ Google Maps API 키 설정
5. ⏳ 종이비행기 애니메이션 구현 (GSAP)
6. ⏳ 실시간 알림 (Supabase Realtime)
7. ⏳ 소울 탐색 페이지 완성

## 🔗 링크

- **GitHub**: https://github.com/skykoho/NewHeartKemi
- **Supabase**: https://supabase.com
- **Vercel**: https://vercel.com

## 📄 라이선스

© 2026 HeartKemy. All rights reserved.

---

**💡 Tip**: Supabase는 PostgreSQL 기반으로 강력한 쿼리, 실시간 기능, 파일 스토리지 등을 제공합니다.
