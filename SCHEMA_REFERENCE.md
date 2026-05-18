# StudyGroupFinder Database Schema

## 📊 Entity Relationship Diagram

```
┌─────────────────────┐
│      Users          │
├─────────────────────┤
│ id (PK)             │
│ email               │
│ username            │
│ password            │
│ university          │
│ department          │
│ totalXp             │
│ totalStudyMinutes   │
│ createdAt           │
└─────────────────────┘
         ▲
    ┌────┴────┬──────────┬─────────┐
    │         │          │         │
    │         │          │         │
    ▼         ▼          ▼         ▼
┌──────────┐ ┌──────────────────┐ ┌─────────────────┐ ┌──────────────┐
│UserInter-│ │AvailabilitySlot  │ │GroupMember      │ │StudySession- │
│est       │ │                  │ │                 │ │Member        │
├──────────┤ ├──────────────────┤ ├─────────────────┤ ├──────────────┤
│ id       │ │ id               │ │ id              │ │ id           │
│ userId★ │ │ userId★          │ │ groupId★        │ │ sessionId★   │
│ topic    │ │ day              │ │ userId★         │ │ userId★      │
│ level    │ │ startHour        │ │ joinedAt        │ │ minutesStud. │
│          │ │ endHour          │ │                 │ │ xpEarned     │
└──────────┘ └──────────────────┘ └─────────────────┘ └──────────────┘
                                              ▲
                                              │
                                    ┌─────────┴──────────┐
                                    │                    │
                                    ▼                    ▼
                            ┌────────────────────┐  ┌─────────────┐
                            │StudyGroup          │  │StudySession │
                            ├────────────────────┤  ├─────────────┤
                            │ id (PK)            │  │ id (PK)     │
                            │ name               │  │ groupId★    │
                            │ topic              │  │ startTime   │
                            │ description        │  │ endTime     │
                            │ creatorId★         │  │ duration    │
                            │ maxMembers         │  │ createdAt   │
                            │ isActive           │  └─────────────┘
                            └────────────────────┘
                                    ▲
                                    │
                                    │
                            ┌───────┴────────┐
                            │                │
                            ▼                ▼
                        ┌────────┐    ┌──────────────┐
                        │Message │    │UserMatch     │
                        ├────────┤    ├──────────────┤
                        │ id     │    │ id           │
                        │ content│    │ user1Id★     │
                        │ userId*│    │ user2Id★     │
                        │groupId*│    │ matchScore   │
                        │created │    └──────────────┘
                        └────────┘


┌─────────────────────────────────┐
│           Notes & Privacy        │
├─────────────────────────────────┤
│                                 │
│  ┌──────────────────────────┐  │
│  │ Note                     │  │
│  ├──────────────────────────┤  │
│  │ id (PK)                  │  │
│  │ userId★                  │  │
│  │ title                    │  │
│  │ isPrivate                │  │
│  │ createdAt                │  │
│  └──────────────────────────┘  │
│      ▲                ▲         │
│      │                │         │
│   ┌──┴──┐      ┌──────┴──┐    │
│   │     │      │         │    │
│   ▼     ▼      ▼         ▼    │
│┌────────┐ ┌─────────────────┐ │
││Note    │ │NoteAccessRequest││
││Content │ ├─────────────────┤ │
│├────────┤ │ id              │ │
││ id     │ │ noteId★         │ │
││ noteId*│ │ requesterId★    │ │
││ type   │ │ status (pending/││
││content │ │ approved/reject)│ │
││metadata│ │ createdAt       │ │
││ order  │ └─────────────────┘ │
│└────────┘                      │
│                                 │
└─────────────────────────────────┘
```

## 📋 Table Descriptions

### Users
- **Primary storage for user accounts and profiles**
- Stores authentication credentials
- Tracks study progress (XP, minutes)
- Central entity linked to all other tables

### UserInterest
- **Many-to-many relationship: Users to Study Topics**
- Records topic and proficiency level
- Used for matching and recommendations
- Unique constraint: one interest topic per user

### AvailabilitySlot
- **One-to-many: User to their weekly availability**
- Stores when users are available to study
- Used for scheduling and matching
- Days represented as: mon, tue, wed, etc.

### StudyGroup
- **Group information and metadata**
- Created by a user (creator)
- Has members through GroupMember table
- Can have multiple study sessions

### GroupMember
- **Many-to-many: Users to Groups**
- Tracks group membership
- Records when user joined

### StudySession
- **Individual study session instance**
- Belongs to a study group
- Has multiple participants through StudySessionMember
- Tracks session duration and participants

### StudySessionMember
- **Many-to-many: Users to Study Sessions**
- Records user participation in sessions
- Tracks minutes studied and XP earned per session

### Note
- **User's note with privacy control**
- Can be public (visible to all) or private
- Links to content blocks
- Links to access requests

### NoteContent
- **Individual content block within a note**
- Type: text, image, or link
- Ordered within the note
- Metadata stores additional info (image alt text, link title, etc.)

### NoteAccess
- **Tracks which users have access to private notes**
- Created when access request is approved
- Allows querying "who can see this note?"

### NoteAccessRequest
- **Request to access a private note**
- Status: pending, approved, rejected
- Links requester to note owner through Note relationship

### Message
- **Chat messages (global or group-specific)**
- If groupId is NULL: global chat
- If groupId is set: group-specific chat
- Indexed on groupId and userId for fast queries

### UserMatch
- **Compatibility score between two users**
- Unique constraint: only one match record per user pair
- Score 0-100 representing compatibility
- Used for the matching/recommendation feature

---

## 🔗 Key Relationships

### One-to-Many
- `User` → `UserInterest` (one user has many interests)
- `User` → `AvailabilitySlot` (one user has many availability slots)
- `User` → `Note` (one user has many notes)
- `User` → `Message` (one user sends many messages)
- `User` → `StudySession` (through StudySessionMember)
- `StudyGroup` → `GroupMember` (one group has many members)
- `StudyGroup` → `StudySession` (one group has many sessions)
- `StudyGroup` → `Message` (one group has many messages)
- `Note` → `NoteContent` (one note has many content blocks)
- `Note` → `NoteAccessRequest` (one note has many access requests)

### Many-to-Many
- `User` ↔ `StudyGroup` (through GroupMember)
- `User` ↔ `StudySession` (through StudySessionMember)
- `User` ↔ `User` (through UserMatch - self-referential)
- `User` ↔ `Note` (through NoteAccess - for privacy)

---

## 📌 Query Examples

### Get User's Study Groups
```prisma
user.groupsMemberships.where({ user.id = userId })
```

### Get Private Notes with Pending Requests
```prisma
Note.findMany({
  where: { userId, isPrivate: true },
  include: { accessRequests: { where: { status: "pending" } } }
})
```

### Get User's Study Sessions with Stats
```prisma
StudySessionMember.findMany({
  where: { userId },
  include: { session: { include: { group: true } } }
})
```

### Get Compatible Users for Matching
```prisma
UserMatch.findMany({
  where: { user1Id: userId },
  orderBy: { matchScore: 'desc' }
})
```

### Get User's Message History
```prisma
Message.findMany({
  where: { userId },
  orderBy: { createdAt: 'desc' }
})
```

---

## 🛡️ Data Integrity

### Cascade Deletes
When a user is deleted, all related records are automatically deleted:
- User's interests
- User's availability
- User's notes
- User's messages
- Group memberships
- Study session participations

### Unique Constraints
- Email and username (no duplicates)
- UserInterest: (userId, topic) - one topic per user
- GroupMember: (groupId, userId) - user can't join twice
- StudySessionMember: (sessionId, userId) - user in session once
- NoteAccess: (noteId, userId) - user granted access once
- NoteAccessRequest: (noteId, requesterId) - one request per user per note
- UserMatch: (user1Id, user2Id) - one match record per pair

---

## 🔑 Indexes

Strategic indexes for fast queries:
- Users: id, email, username
- Messages: groupId, userId (for fast filtering)
- StudySessionMember: sessionId, userId
- All foreign keys are automatically indexed

