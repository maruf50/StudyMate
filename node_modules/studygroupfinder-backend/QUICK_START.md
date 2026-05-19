# ⚡ Quick Start - Prisma + PostgreSQL Setup

## 🎯 What Was Created

```
✅ Prisma Schema (prisma/schema.prisma)
   └─ Comprehensive database model for all features
   
✅ Backend Application (apps/backend/)
   ├─ package.json (dependencies)
   ├─ tsconfig.json (TypeScript config)
   ├─ .env.example (environment template)
   ├─ src/index.ts (Express server with basic routes)
   └─ src/seed.ts (sample data)

✅ Documentation
   ├─ DATABASE_SETUP.md (detailed setup guide)
   ├─ SCHEMA_REFERENCE.md (schema documentation)
   └─ QUICK_START.md (this file)
```

## 🚀 5-Minute Setup

### 1. Install PostgreSQL
**Windows:** Download from https://www.postgresql.org/download/windows/  
**Mac:** `brew install postgresql@15`  
**Linux:** `sudo apt install postgresql`

### 2. Create Database
```bash
psql -U postgres
CREATE DATABASE studygroupfinder;
\q
```

### 3. Configure Backend
```bash
# Create .env file from template
cp apps/backend/.env.example apps/backend/.env

# Edit apps/backend/.env
# Update: DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/studygroupfinder"
```

### 4. Initialize Prisma
```bash
# Install dependencies
npm install

# Generate Prisma Client
npm run prisma:generate -w apps/backend

# Create database tables
npm run prisma:migrate:dev -w apps/backend
# Enter migration name: init

# Seed sample data (optional)
npm run prisma:seed -w apps/backend
```

### 5. Start Backend
```bash
npm run dev -w apps/backend
```

**Should see:** `✅ Server running on http://localhost:4000`

### 6. Verify (in another terminal)
```bash
# Test API
curl http://localhost:4000/api/health

# View database (opens UI)
npm run prisma:studio -w apps/backend
```

## 📊 What's in the Database

After seeding, you'll have:
- **3 demo users** (Demo Student, Alice, Bob)
- **2 study groups** (Algebra Team, Programming Workshop)
- **2 sample notes** (public and private)
- **Messages** and **Study Sessions**
- **Access Requests** for privacy testing

## 🔗 Database Tables

```
users
├─ user_interests
├─ availability_slots
├─ notes
│  ├─ note_contents
│  ├─ note_access_requests
│  └─ note_access
├─ study_groups
│  ├─ group_members
│  └─ study_sessions
│     └─ study_session_members
├─ messages
└─ user_matches
```

## 📝 Backend Structure

```
apps/backend/
├─ src/
│  ├─ index.ts (main Express app)
│  └─ seed.ts (sample data)
├─ dist/ (compiled JS)
├─ prisma/
│  └─ schema.prisma (database model)
├─ package.json
├─ tsconfig.json
└─ .env (local config)
```

## 🛣️ Available API Routes

```
POST   /api/auth/register        - Create account
POST   /api/auth/login           - Login
GET    /api/auth/me              - Current user

GET    /api/notes                - Get user's notes
POST   /api/notes                - Create note
PUT    /api/notes/:id/privacy    - Toggle note privacy

GET    /api/groups               - Get all groups
POST   /api/groups               - Create group
POST   /api/groups/:id/join      - Join group
```

## 🛠️ Common Commands

```bash
# View/manage database UI
npm run prisma:studio -w apps/backend

# Create new migration (after schema changes)
npm run prisma:migrate:dev -w apps/backend

# Add more seed data
npm run prisma:seed -w apps/backend

# Reset database (⚠️ deletes all data!)
npx prisma migrate reset -w apps/backend

# Generate Prisma Client
npm run prisma:generate -w apps/backend
```

## 🔐 Environment Variables

```env
# Database Connection
DATABASE_URL=postgresql://postgres:PASSWORD@localhost:5432/studygroupfinder

# Server
PORT=4000
NODE_ENV=development

# Authentication
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRE=7d

# CORS
CORS_ORIGIN=http://localhost:5173
```

## 📖 For More Details

- **Full Setup Guide:** See [DATABASE_SETUP.md](./DATABASE_SETUP.md)
- **Schema Details:** See [SCHEMA_REFERENCE.md](./SCHEMA_REFERENCE.md)
- **Prisma Docs:** https://www.prisma.io/docs

## ✅ Next Steps

1. ✅ Database set up
2. ⬜ Connect frontend to backend (update API calls)
3. ⬜ Implement authentication (JWT tokens)
4. ⬜ Add more API endpoints
5. ⬜ Implement real-time features (Socket.IO)
6. ⬜ Deploy to production

## 🆘 Troubleshooting

**"Cannot find module '@prisma/client'"**
```bash
npm install -w apps/backend
npm run prisma:generate -w apps/backend
```

**"PostgreSQL connection refused"**
- Make sure PostgreSQL is running
- Check DATABASE_URL in .env (username, password, port)

**"Database doesn't exist"**
```bash
psql -U postgres
CREATE DATABASE studygroupfinder;
```

**"Port already in use"**
- Change PORT in .env to 3000, 5000, etc.

---

**You're ready! 🎉 Start building your study platform!**
