# 💜 HeartKemy

> 글로 마음을 정리하고, 비슷한 영혼과 느리게 이어지는 감정 커뮤니티

## 📖 프로젝트 개요

**HeartKemy**는 진정성을 바탕으로 자신의 감정을 글로 표현하고, AI 분석을 통해 자기 이해를 높이며, 비슷한 감성을 가진 사람들과 편지로 소통하는 감정 기반 커뮤니티 웹 애플리케이션입니다.

### 핵심 가치

- **진정성 (Authenticity)**: 일상을 미화하지 않고 솔직한 감정 표현
- **자기 이해 (Self-Discovery)**: AI 기반 감정·가치관 분석
- **느린 연결 (Slow Connection)**: 편지 중심의 비동기 소통
- **감성적 경험 (Emotional Experience)**: 따뜻한 디자인과 UX

## 🚀 현재 구현된 기능

### ✅ 완료된 핵심 기능

1. **홈/대시보드** (`/`)
   - 이번 주 글쓰기 통계
   - 최근 감정 패턴 분석
   - 오늘의 질문 제시
   - 빠른 액션 버튼

2. **글쓰기** (`/write`)
   - AI 생성 오늘의 질문
   - 자유 형식 텍스트 입력 (최소 30자)
   - 감정 키워드 선택 (최대 3개)
   - 위치 정보 자동 수집
   - 실시간 글자 수 카운터

3. **AI 분석** (`/analysis`)
   - 핵심 가치관 3개 추출
   - 감정 톤 비율 분석 (5가지 감정)
   - 주요 키워드 추출
   - AI 인사이트 제공

4. **감성 지도** (`/map`)
   - Google Maps 기반 인터랙티브 지도
   - 말풍선 형태 감정 글 마커
   - 감정 유형별 필터링
   - 실시간 포스트 렌더링
   - 좋아요 기능

5. **편지 시스템** (`/letters`)
   - 편지 작성 (`/letters/compose`)
   - 감정 키워드 첨부
   - 종이비행기 비행 시간 계산 (20km/h)
   - 받은/보낸 편지함

6. **PWA 지원**
   - Service Worker 등록
   - Web App Manifest
   - 오프라인 지원
   - 홈 화면 추가 가능

### 📊 데이터베이스 스키마

- **users**: 사용자 정보
- **posts**: 글 데이터
- **emotion_keywords**: 감정 키워드 (15개)
- **post_emotions**: 포스트-감정 연결
- **ai_analyses**: AI 분석 결과
- **letters**: 편지 데이터
- **letter_emotions**: 편지-감정 연결
- **likes**: 좋아요 데이터

## 🛠 기술 스택

### Frontend
- **Vanilla JavaScript** - 순수 자바스크립트
- **TailwindCSS** - 유틸리티 기반 CSS 프레임워크
- **Google Maps JavaScript API** - 지도 기능
- **PWA** - Progressive Web App

### Backend
- **Hono** - 경량 웹 프레임워크
- **Cloudflare Workers** - 엣지 컴퓨팅 플랫폼
- **Cloudflare D1** - SQLite 기반 분산 데이터베이스

### Development
- **TypeScript** - 타입 안전성
- **Vite** - 빌드 도구
- **Wrangler** - Cloudflare CLI
- **PM2** - 프로세스 관리

## 📁 프로젝트 구조

```
heartkemy/
├── src/
│   ├── index.tsx           # 메인 애플리케이션 (API + HTML)
│   └── renderer.tsx        # HTML 렌더러
├── public/
│   └── static/
│       ├── manifest.json   # PWA 매니페스트
│       ├── sw.js           # Service Worker
│       └── style.css       # 커스텀 스타일
├── migrations/
│   └── 0001_initial_schema.sql  # D1 마이그레이션
├── seed.sql                # 시드 데이터
├── ecosystem.config.cjs    # PM2 설정
├── wrangler.jsonc          # Cloudflare 설정
├── package.json
└── README.md
```

## 🚦 로컬 개발 환경 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 데이터베이스 마이그레이션

```bash
npm run db:migrate:local
npm run db:seed:local
```

### 3. 빌드

```bash
npm run build
```

### 4. 개발 서버 시작

```bash
# PM2로 시작 (권장)
pm2 start ecosystem.config.cjs

# 또는 직접 실행
npm run dev:sandbox
```

### 5. 접속

- 로컬: `http://localhost:3000`
- 공개 URL: https://3000-in9id8l4o3hsu9b6x0a73-2e1b9533.sandbox.novita.ai

## 🌐 배포

### Cloudflare Pages 배포

```bash
# 1. Cloudflare API 키 설정 (처음 한번만)
# Deploy 탭에서 API 키 설정 필요

# 2. D1 데이터베이스 생성
npm run db:create

# 3. 프로덕션 마이그레이션
npm run db:migrate:prod

# 4. 배포
npm run deploy:prod
```

## 📝 주요 API 엔드포인트

### 사용자
- `GET /api/users/me` - 현재 사용자 정보

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

## ⚠️ 미구현 기능

### 1. 인증 시스템
- Google OAuth 연동 필요
- 세션/JWT 관리

### 2. OpenAI GPT-4 연동
- 실제 AI 분석 API 호출
- 환경변수 설정 필요

### 3. Google Maps API 키
- 실제 지도 기능 작동을 위해 API 키 필요
- `wrangler.jsonc`에 환경변수 추가

### 4. 종이비행기 애니메이션
- 실시간 비행 애니메이션 (GSAP)
- 지도 상에서 움직이는 비행기

### 5. 소울 탐색 (`/explore`)
- 가치관 유사도 계산
- 추천 알고리즘

## 🎨 디자인 시스템

### 컬러 팔레트
- **Primary**: `#9370DB` (Medium Purple)
- **Accent**: `#FFD700` (Gold)
- **Emotions**:
  - 따뜻함: `#FFA500` (Orange)
  - 위로: `#87CEEB` (Sky Blue)
  - 설렘: `#9370DB` (Medium Purple)
  - 고독: `#A9A9A9` (Dark Gray)
  - 진심: `#FFD700` (Gold)

### 폰트
- **본문**: Noto Sans KR
- **손글씨**: Nanum Pen Script

## 📈 다음 단계

1. **Google OAuth 인증 구현**
2. **OpenAI GPT-4 실제 연동**
3. **Google Maps API 키 설정**
4. **종이비행기 애니메이션 구현 (GSAP)**
5. **소울 탐색 페이지 완성**
6. **실시간 알림 시스템**
7. **프로덕션 배포 및 테스트**

## 📄 라이선스

© 2026 HeartKemy. All rights reserved.

---

**💡 Tip**: 이 프로젝트는 Cloudflare Workers 환경에 최적화되어 있습니다. Node.js 런타임이나 파일 시스템 API는 사용하지 않습니다.
