# Database Setup Guide - Prisma + PostgreSQL

This guide will help you set up PostgreSQL and Prisma for the StudyGroupFinder backend.

## 📋 Prerequisites

Make sure you have:
- Node.js 16+ installed
- PostgreSQL 12+ installed
- npm or yarn package manager

## 🚀 Step-by-Step Setup

### 1. Install PostgreSQL

#### **Windows (Using PostgreSQL Installer)**
- Download from: https://www.postgresql.org/download/windows/
- Run the installer and follow the installation wizard
- **Remember the password** you set for the `postgres` user
- Default settings are fine

#### **macOS (Using Homebrew)**
```bash
brew install postgresql@15
brew services start postgresql@15
```

#### **Linux (Ubuntu/Debian)**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo service postgresql start
```

### 2. Create Database

Open PostgreSQL command line (psql):

**Windows:** Search for "SQL Shell (psql)" in Start Menu  
**macOS/Linux:** Run `psql` in terminal

Then execute:
```sql
CREATE DATABASE studygroupfinder;
```

Verify it was created:
```sql
\l
```

You should see `studygroupfinder` in the list.

### 3. Configure Environment File

Create `.env` file in `apps/backend/`:

```bash
cp apps/backend/.env.example apps/backend/.env
```

Edit `apps/backend/.env` with your PostgreSQL credentials:

```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/studygroupfinder"
PORT=4000
NODE_ENV=development
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRE=7d
CORS_ORIGIN=http://localhost:5173
```

**Replace:**
- `YOUR_PASSWORD` with the password you set during PostgreSQL installation (default is usually `postgres`)
- `JWT_SECRET` with a strong random string

### 4. Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
npm install -w apps/backend
```

### 5. Setup Prisma

Generate Prisma Client:
```bash
npm run prisma:generate -w apps/backend
```

Run migrations to create tables:
```bash
npm run prisma:migrate:dev -w apps/backend
```

When prompted, give your migration a name (e.g., "init"):
```
✔ Enter a name for the new migration: › init
```

This will:
- Create all tables from the schema
- Generate the Prisma Client

### 6. Seed Initial Data (Optional)

Populate the database with sample data:
```bash
npm run prisma:seed -w apps/backend
```

You should see:
```
✅ Database seeded successfully!

📊 Seeded data:
  - 3 users
  - 2 study groups
  - 2 notes
  - 2 user matches
  - 1 access request
```

### 7. Verify Database Setup

Open Prisma Studio (visual database browser):
```bash
npm run prisma:studio -w apps/backend
```

This opens http://localhost:5555 where you can:
- View all tables and data
- Add/edit/delete records
- Explore relationships

### 8. Start the Backend Server

```bash
npm run dev -w apps/backend
```

You should see:
```
✅ Server running on http://localhost:4000
```

Test the API:
```bash
curl http://localhost:4000/api/health
```

Expected response:
```json
{"status":"ok","message":"Server is running"}
```

---

## 📊 Database Schema Overview

### Core Tables

**users**
- Store user profile, credentials, XP, study time
- Links to: interests, availability, groups, notes, messages

**user_interests**
- Many-to-many: users and their interests (topic + proficiency level)

**availability_slots**
- One-to-many: user's weekly availability
- Days: mon, tue, wed, thu, fri, sat, sun

**study_groups**
- Study group information
- Links to members, sessions, messages

**group_members**
- Many-to-many: users and groups they're in

**study_sessions**
- Track individual study sessions
- Links to participants (study_session_members)

**study_session_members**
- Track user participation in sessions
- Records minutes studied and XP earned

**notes**
- User's notes with privacy settings
- Links to content blocks and access requests

**note_contents**
- Individual content blocks (text/image/link)
- Ordered within each note

**note_access_requests**
- Requests to access private notes
- Status: pending, approved, rejected

**note_access**
- Users granted access to private notes

**messages**
- Chat messages (global if groupId is null, group-specific otherwise)

**user_matches**
- Compatibility scores between users for matching

---

## 🔧 Common Commands

```bash
# View/edit database in UI
npm run prisma:studio -w apps/backend

# Create a new migration (after schema changes)
npm run prisma:migrate:dev -w apps/backend

# Deploy migrations (production)
npm run prisma:migrate:deploy -w apps/backend

# Reset database (⚠️ deletes all data)
npx prisma migrate reset -w apps/backend

# Generate Prisma Client
npm run prisma:generate -w apps/backend
```

---

## 🐛 Troubleshooting

### "password authentication failed"
- Check your PostgreSQL password in `.env`
- Default password during install is often `postgres`
- Can reset in PostgreSQL: `ALTER USER postgres WITH PASSWORD 'newpassword';`

### "database studygroupfinder does not exist"
- Run in psql: `CREATE DATABASE studygroupfinder;`

### "Port 4000 already in use"
- Change `PORT` in `.env` to another port (5000, 3000, etc.)

### Migrations fail or schema issues
```bash
# Reset everything (WARNING: deletes all data)
npx prisma migrate reset -w apps/backend
```

### Can't connect to PostgreSQL server
- Make sure PostgreSQL service is running:
  - **Windows:** Check Services (postgresql-x64)
  - **macOS:** `brew services list`
  - **Linux:** `sudo service postgresql status`

---

## 📝 Next Steps

1. **Connect Frontend to Backend**
   - Update API calls in `apps/frontend/src/api.ts` to call real endpoints
   - Change from mock data to HTTP requests

2. **Add Authentication**
   - Implement JWT token generation on login
   - Add middleware to verify tokens on protected routes
   - Hash passwords with bcryptjs before storing

3. **Implement Real API Endpoints**
   - Create routes for all features (matching, sessions, etc.)
   - Add proper error handling

4. **Add Real-time Features**
   - Implement Socket.IO for live chat
   - Update study session tracking in real-time

---

## ✅ You're All Set!

Your database and backend are ready. You can now:
- Continue backend development
- Connect frontend to real API endpoints
- Add authentication and authorization
- Implement real-time features

For Prisma documentation: https://www.prisma.io/docs
