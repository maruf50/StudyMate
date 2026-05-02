# StudyGroupFinder

Initial implementation of a study helper platform with:
- Account registration/login
- Interest + schedule profile
- User matching (interests + level + schedule overlap)
- Group creation/join
- Study sessions with XP + hour tracking
- Global and group chat (Socket.IO)
- Personal notes section

## Project Structure

- `apps/api`: Express + TypeScript backend
- `apps/web`: React + TypeScript frontend (Vite)
- `packages/shared`: shared types package

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Create API env file:

```bash
copy apps\\api\\.env.example apps\\api\\.env
```

3. Run both frontend and backend:

```bash
npm run dev
```

- API: http://localhost:4000
- Web: http://localhost:5173

## Implemented API Endpoints

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Profile + Matching
- `PUT /api/profile`
- `GET /api/matches/users`

### Groups
- `GET /api/groups`
- `POST /api/groups`
- `POST /api/groups/:groupId/join`

### Study Tracking
- `POST /api/study-sessions/start`
- `POST /api/study-sessions/:sessionId/end`
- `GET /api/stats/me`

### Notes
- `GET /api/notes`
- `POST /api/notes`
- `PUT /api/notes/:noteId`
- `DELETE /api/notes/:noteId`

### Chat History
- `GET /api/chat/global`
- `GET /api/chat/groups/:groupId`

### Socket Events
- `chat:global` -> `chat:global:message`
- `join:group`
- `chat:group` -> `chat:group:message`

## Current Storage

This first implementation uses an in-memory store for speed. Data resets when the API server restarts.

## Next Suggested Backend Upgrade

Switch to PostgreSQL + Prisma for persistent data and production-safe constraints.
