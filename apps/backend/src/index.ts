import express, { Express, NextFunction, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { AsyncLocalStorage } from "node:async_hooks";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

dotenv.config();

const app: Express = express();
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString })
});

type UserForResponse = {
  id: string;
  email: string;
  username: string;
  university: string | null;
  department: string | null;
  totalXp: number;
  totalStudyMinutes: number;
  profileImageUrl?: string | null;
  bio?: string | null;
  interests?: Array<{ topic: string; level: string }>;
  availability?: Array<{ day: string; startHour: number; endHour: number }>;
};

function serializeUser(user: UserForResponse) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    university: user.university ?? "",
    department: user.department ?? "",
    totalXp: user.totalXp,
    totalStudyMinutes: user.totalStudyMinutes,
    profileImageUrl: user.profileImageUrl ?? undefined,
    bio: user.bio ?? undefined,
    interests: user.interests ?? [],
    availability: user.availability ?? []
  };
}

async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

async function verifyPassword(inputPassword: string, storedPassword: string) {
  if (storedPassword.startsWith("$2a$") || storedPassword.startsWith("$2b$") || storedPassword.startsWith("$2y$")) {
    return bcrypt.compare(inputPassword, storedPassword);
  }

  // Supports old lab/demo rows that were saved before password hashing was added.
  return inputPassword === storedPassword;
}

const requestContext = new AsyncLocalStorage<{ userId: string }>();

async function getCurrentUserId(req?: Request) {
  const contextUserId = requestContext.getStore()?.userId;

  if (contextUserId) {
    return contextUserId;
  }

  const headerUserId = req?.header("x-user-id");

  if (headerUserId) {
    const user = await prisma.user.findUnique({ where: { id: headerUserId } });

    if (user) {
      return user.id;
    }
  }

  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });

  if (!user) {
    throw new Error("No demo user found in the database");
  }

  return user.id;
}

async function getAcceptedFriendIds(userId: string) {
  const requests = await prisma.friendRequest.findMany({
    where: {
      status: "accepted",
      OR: [{ requesterId: userId }, { addresseeId: userId }]
    }
  });

  return new Set<string>(
    requests.map((request) => (request.requesterId === userId ? request.addresseeId : request.requesterId))
  );
}

function serializeFriendRequest(request: {
  id: string;
  requesterId: string;
  requester: { username: string };
  addresseeId: string;
  addressee: { username: string };
  status: string;
  createdAt: Date;
}) {
  return {
    id: request.id,
    requesterId: request.requesterId,
    requesterUsername: request.requester.username,
    addresseeId: request.addresseeId,
    addresseeUsername: request.addressee.username,
    status: request.status,
    createdAt: request.createdAt
  };
}

function serializeNote(note: {
  id: string;
  userId: string;
  title: string;
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
  user: { username: string };
  content: Array<{ id: string; type: string; content: string; metadata: string | null; order: number }>;
  accessRequests: Array<{ status: string }>;
  allowedUsers: Array<{ userId: string }>;
}, currentUserId: string, friendIds: Set<string>) {
  const isOwner = note.userId === currentUserId;
  const isFriend = friendIds.has(note.userId);
  const hasExplicitAccess = note.allowedUsers.some((access) => access.userId === currentUserId);

  if (!isOwner && note.isPrivate && !isFriend && !hasExplicitAccess) {
    return null;
  }

  return {
    id: note.id,
    userId: note.userId,
    ownerUsername: note.user.username,
    title: note.title,
    isPrivate: note.isPrivate,
    canEdit: isOwner,
    isFriendShared: isFriend && !isOwner,
    content: note.content
      .slice()
      .sort((left, right) => left.order - right.order)
      .map((block) => ({
        id: block.id,
        type: block.type,
        content: block.content,
        metadata: block.metadata || undefined
      })),
    accessRequestCount: isOwner ? note.accessRequests.filter((request) => request.status === "pending").length : 0
  };
}

// Middleware
const allowedOrigins = new Set([
  process.env.CORS_ORIGIN || "http://localhost:5173",
  "http://127.0.0.1:5173"
]);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function isPublicRoute(req: Request) {
  return (
    (req.method === "GET" && req.path === "/api/health") ||
    (req.method === "POST" && req.path === "/api/auth/register") ||
    (req.method === "POST" && req.path === "/api/auth/login")
  );
}

app.use(async (req, _res, next) => {
  if (isPublicRoute(req)) {
    return next();
  }

  try {
    const currentUserId = await getCurrentUserId(req);
    requestContext.run({ userId: currentUserId }, () => next());
  } catch (error) {
    next(error);
  }
});

// Health Check
app.get("/api/health", (req: Request, res: Response) => {
  void req;
  res.json({ status: "ok", message: "Server is running" });
});

// ===== USER ROUTES =====

// Register
app.post("/api/auth/register", async (req: Request, res: Response) => {
  try {
    const { email, username, password, university, department } = req.body as {
      email?: string;
      username?: string;
      password?: string;
      university?: string;
      department?: string;
    };

    if (!email?.trim() || !username?.trim() || !password?.trim()) {
      return res.status(400).json({ error: "Email, username, and password are required" });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.trim().toLowerCase() },
          { username: username.trim() }
        ]
      }
    });

    if (existingUser) {
      return res.status(409).json({ error: "Email or username already exists" });
    }

    const user = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        username: username.trim(),
        password: await hashPassword(password),
        university: university?.trim() || null,
        department: department?.trim() || null
      },
      include: { interests: true, availability: true }
    });

    return res.status(201).json({ user: serializeUser(user), token: user.id });
  } catch (error) {
    console.error("Registration failed", error);
    return res.status(400).json({ error: "Registration failed" });
  }
});

// Login
app.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email?.trim() || !password?.trim()) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { interests: true, availability: true }
    });

    if (!user || !(await verifyPassword(password, user.password))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    return res.json({ user: serializeUser(user), token: user.id });
  } catch (error) {
    console.error("Login failed", error);
    return res.status(400).json({ error: "Login failed" });
  }
});

// Get Current User
app.get("/api/auth/me", async (req: Request, res: Response) => {
  try {
    void req;
    const userId = await getCurrentUserId();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        interests: true,
        availability: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ user: serializeUser(user) });
  } catch (error) {
    console.error("Failed to get user", error);
    return res.status(400).json({ error: "Failed to get user" });
  }
});

app.get("/api/stats/me", async (req: Request, res: Response) => {
  try {
    void req;
    const userId = await getCurrentUserId();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { totalXp: true, totalStudyMinutes: true }
    });

    res.json({
      totalXp: user?.totalXp ?? 0,
      totalStudyMinutes: user?.totalStudyMinutes ?? 0
    });
  } catch (error) {
    res.status(400).json({ error: "Failed to get stats" });
  }
});

app.get("/api/matches/users", async (req: Request, res: Response) => {
  try {
    void req;
    const currentUserId = await getCurrentUserId();

    const [currentUser, users] = await Promise.all([
      prisma.user.findUnique({
        where: { id: currentUserId },
        include: { interests: true }
      }),
      prisma.user.findMany({
        where: { id: { not: currentUserId } },
        include: { interests: true }
      })
    ]);

    const currentTopics = new Set((currentUser?.interests || []).map((interest) => interest.topic));

    const matches = users.map((candidate) => {
      const overlap = candidate.interests.filter((interest) => currentTopics.has(interest.topic)).length;
      const score = Math.max(50, 100 - candidate.interests.length * 5 + overlap * 15);

      return {
        userId: candidate.id,
        username: candidate.username,
        score,
        interests: candidate.interests.map((interest) => ({ topic: interest.topic }))
      };
    });

    res.json({ matches });
  } catch (error) {
    res.status(400).json({ error: "Failed to get matches" });
  }
});

app.put("/api/profile", async (req: Request, res: Response) => {
  try {
    const userId = await getCurrentUserId();
    const { university, department, interests, availability } = req.body;

    const updatedUser = await prisma.$transaction(async (tx) => {
      await tx.userInterest.deleteMany({ where: { userId } });
      await tx.availabilitySlot.deleteMany({ where: { userId } });

      return tx.user.update({
        where: { id: userId },
        data: {
          university,
          department,
          interests: {
            create: (interests || []).map((interest: { topic: string; level: string }) => ({
              topic: interest.topic,
              level: interest.level
            }))
          },
          availability: {
            create: (availability || []).map((slot: { day: string; startHour: number; endHour: number }) => ({
              day: slot.day,
              startHour: slot.startHour,
              endHour: slot.endHour
            }))
          }
        },
        include: {
          interests: true,
          availability: true
        }
      });
    });

    res.json({ user: updatedUser });
  } catch (error) {
    res.status(400).json({ error: "Failed to update profile" });
  }
});

app.get("/api/friends/requests", async (req: Request, res: Response) => {
  try {
    void req;
    const userId = await getCurrentUserId();

    const requests = await prisma.friendRequest.findMany({
      where: {
        OR: [{ requesterId: userId }, { addresseeId: userId }]
      },
      include: {
        requester: true,
        addressee: true
      },
      orderBy: { createdAt: "desc" }
    });

    return res.json({
      requests: requests.map((request) => ({
        ...serializeFriendRequest(request),
        isIncoming: request.addresseeId === userId,
        isOutgoing: request.requesterId === userId
      }))
    });
  } catch (error) {
    return res.status(400).json({ error: "Failed to get friend requests" });
  }
});

app.post("/api/friends/requests", async (req: Request, res: Response) => {
  try {
    const requesterId = await getCurrentUserId();
    const { targetUserId, targetUsername } = req.body;
    const targetIdentifier = (targetUserId || targetUsername || "").trim();

    if (!targetIdentifier || targetIdentifier === requesterId) {
      return res.status(400).json({ error: "Invalid friend request target" });
    }

    const targetUser = await prisma.user.findFirst({
      where: {
        OR: [
          { id: targetIdentifier },
          { username: targetIdentifier }
        ]
      }
    });

    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const existing = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { requesterId, addresseeId: targetUser.id },
          { requesterId: targetUser.id, addresseeId: requesterId }
        ]
      },
      include: {
        requester: true,
        addressee: true
      }
    });

    if (existing) {
      if (existing.status === "pending" && existing.requesterId === targetUser.id && existing.addresseeId === requesterId) {
        const accepted = await prisma.friendRequest.update({
          where: { id: existing.id },
          data: { status: "accepted" },
          include: { requester: true, addressee: true }
        });

        return res.json({ request: serializeFriendRequest(accepted) });
      }

      return res.json({ request: serializeFriendRequest(existing) });
    }

    const request = await prisma.friendRequest.create({
      data: {
        requesterId,
        addresseeId: targetUser.id,
        status: "pending"
      },
      include: {
        requester: true,
        addressee: true
      }
    });

    return res.status(201).json({ request: serializeFriendRequest(request) });
  } catch (error) {
    return res.status(400).json({ error: "Failed to create friend request" });
  }
});

app.post("/api/friends/requests/:requestId/accept", async (req: Request, res: Response) => {
  try {
    void req;
    const { requestId } = req.params;
    const userId = await getCurrentUserId();

    const existing = await prisma.friendRequest.findUnique({
      where: { id: requestId },
      include: { requester: true, addressee: true }
    });

    if (!existing) {
      return res.status(404).json({ error: "Friend request not found" });
    }

    if (existing.addresseeId !== userId) {
      return res.status(403).json({ error: "Not allowed" });
    }

    const updated = await prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: "accepted" },
      include: { requester: true, addressee: true }
    });

    return res.json({ request: serializeFriendRequest(updated) });
  } catch (error) {
    return res.status(400).json({ error: "Failed to accept friend request" });
  }
});

app.post("/api/friends/requests/:requestId/reject", async (req: Request, res: Response) => {
  try {
    void req;
    const { requestId } = req.params;
    const userId = await getCurrentUserId();

    const existing = await prisma.friendRequest.findUnique({
      where: { id: requestId },
      include: { requester: true, addressee: true }
    });

    if (!existing) {
      return res.status(404).json({ error: "Friend request not found" });
    }

    if (existing.addresseeId !== userId) {
      return res.status(403).json({ error: "Not allowed" });
    }

    const updated = await prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: "rejected" },
      include: { requester: true, addressee: true }
    });

    return res.json({ request: serializeFriendRequest(updated) });
  } catch (error) {
    return res.status(400).json({ error: "Failed to reject friend request" });
  }
});

// Get list of accepted friends
app.get("/api/friends", async (req: Request, res: Response) => {
  try {
    void req;
    const userId = await getCurrentUserId();

    const requests = await prisma.friendRequest.findMany({
      where: {
        status: "accepted",
        OR: [{ requesterId: userId }, { addresseeId: userId }]
      },
      include: {
        requester: true,
        addressee: true
      },
      orderBy: { createdAt: "desc" }
    });

    const friends = requests.map((request) => {
      const friendUser = request.requesterId === userId ? request.addressee : request.requester;
      return {
        id: friendUser.id,
        username: friendUser.username,
        userId: friendUser.id
      };
    });

    return res.json({ friends });
  } catch (error) {
    return res.status(400).json({ error: "Failed to get friends" });
  }
});

// ===== CHAT ROUTES =====

app.get("/api/chat/global", async (req: Request, res: Response) => {
  try {
    void req;
    const messages = await prisma.message.findMany({
      where: { groupId: null },
      include: { user: true },
      orderBy: { createdAt: "asc" }
    });

    res.json({
      messages: messages.map((message) => ({
        id: message.id,
        userId: message.userId,
        username: message.user.username,
        groupId: message.groupId,
        content: message.content,
        createdAt: message.createdAt
      }))
    });
  } catch (error) {
    res.status(400).json({ error: "Failed to get global chat" });
  }
});

app.post("/api/chat/global", async (req: Request, res: Response) => {
  try {
    const userId = await getCurrentUserId();
    const { content } = req.body;

    const created = await prisma.message.create({
      data: {
        userId,
        groupId: null,
        content
      },
      include: { user: true }
    });

    res.status(201).json({
      message: {
        id: created.id,
        userId: created.userId,
        username: created.user.username,
        groupId: created.groupId,
        content: created.content,
        createdAt: created.createdAt
      }
    });
  } catch (error) {
    res.status(400).json({ error: "Failed to send global chat message" });
  }
});

app.get("/api/chat/groups/:groupId", async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;

    const messages = await prisma.message.findMany({
      where: { groupId },
      include: { user: true },
      orderBy: { createdAt: "asc" }
    });

    res.json({
      messages: messages.map((message) => ({
        id: message.id,
        userId: message.userId,
        username: message.user.username,
        groupId: message.groupId,
        content: message.content,
        createdAt: message.createdAt
      }))
    });
  } catch (error) {
    res.status(400).json({ error: "Failed to get group chat" });
  }
});

app.post("/api/chat/groups/:groupId", async (req: Request, res: Response) => {
  try {
    const userId = await getCurrentUserId();
    const { groupId } = req.params;
    const { content } = req.body;

    const created = await prisma.message.create({
      data: {
        userId,
        groupId,
        content
      },
      include: { user: true }
    });

    res.status(201).json({
      message: {
        id: created.id,
        userId: created.userId,
        username: created.user.username,
        groupId: created.groupId,
        content: created.content,
        createdAt: created.createdAt
      }
    });
  } catch (error) {
    res.status(400).json({ error: "Failed to send group chat message" });
  }
});

// ===== NOTES ROUTES =====

// Get User's Notes
app.get("/api/notes", async (req: Request, res: Response) => {
  try {
    void req;
    const userId = await getCurrentUserId();
    const friendIds = await getAcceptedFriendIds(userId);

    const notes = await prisma.note.findMany({
      where: {
        OR: [
          { userId },
          {
            allowedUsers: {
              some: {
                userId
              }
            }
          }
        ]
      },
      include: {
        content: true,
        user: true,
        accessRequests: true,
        allowedUsers: true
      },
    });

    const visibleNotes = notes
      .map((note) => serializeNote(note, userId, friendIds))
      .filter((note): note is NonNullable<ReturnType<typeof serializeNote>> => Boolean(note));

    return res.json({ notes: visibleNotes });
  } catch (error) {
    return res.status(400).json({ error: "Failed to get notes" });
  }
});

// Create Note
app.post("/api/notes", async (req: Request, res: Response) => {
  try {
    const userId = await getCurrentUserId();
    const { title, isPrivate, content } = req.body;

    const note = await prisma.note.create({
      data: {
        userId,
        title: title?.trim() || "Untitled note",
        isPrivate: Boolean(isPrivate),
        content: {
          create: (content || []).map((block: any, index: number) => ({
            type: block.type,
            content: block.content,
            metadata: block.metadata,
            order: index
          }))
        }
      },
      include: {
        content: true,
        user: true,
        accessRequests: true,
        allowedUsers: true
      }
    });

    return res.status(201).json({ note: serializeNote(note, userId, new Set<string>()) });
  } catch (error) {
    return res.status(400).json({ error: "Failed to create note" });
  }
});

// Update Note Privacy
app.put("/api/notes/:noteId/privacy", async (req: Request, res: Response) => {
  try {
    const userId = await getCurrentUserId();
    const { noteId } = req.params;
    const { isPrivate } = req.body as { isPrivate?: boolean };

    const existingNote = await prisma.note.findUnique({ where: { id: noteId } });

    if (!existingNote) {
      return res.status(404).json({ error: "Note not found" });
    }

    if (existingNote.userId !== userId) {
      return res.status(403).json({ error: "Only the note owner can update privacy" });
    }

    const note = await prisma.note.update({
      where: { id: noteId },
      data: { isPrivate: Boolean(isPrivate) }
    });

    return res.json({ note });
  } catch (error) {
    console.error("Failed to update note privacy", error);
    return res.status(400).json({ error: "Failed to update note privacy" });
  }
});

app.post("/api/notes/:noteId/request-access", async (req: Request, res: Response) => {
  try {
    void req;
    const userId = await getCurrentUserId();
    const { noteId } = req.params;

    const note = await prisma.note.findUnique({ where: { id: noteId } });

    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }

    if (note.userId === userId) {
      return res.status(400).json({ error: "Cannot request access to your own note" });
    }

    const existing = await prisma.noteAccessRequest.findUnique({
      where: {
        noteId_requesterId: {
          noteId,
          requesterId: userId
        }
      }
    });

    if (existing) {
      return res.json({ request: existing });
    }

    const request = await prisma.noteAccessRequest.create({
      data: {
        noteId,
        requesterId: userId,
        status: "pending"
      }
    });

    return res.status(201).json({ request });
  } catch (error) {
    return res.status(400).json({ error: "Failed to request access" });
  }
});

app.get("/api/notes/:noteId/access-requests", async (req: Request, res: Response) => {
  try {
    const userId = await getCurrentUserId();
    const { noteId } = req.params;
    const note = await prisma.note.findUnique({ where: { id: noteId } });

    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }

    if (note.userId !== userId) {
      return res.status(403).json({ error: "Only the note owner can view access requests" });
    }

    const requests = await prisma.noteAccessRequest.findMany({
      where: { noteId },
      include: { requester: true },
      orderBy: { createdAt: "desc" }
    });

    return res.json({
      requests: requests.map((request) => ({
        id: request.id,
        noteId: request.noteId,
        requesterId: request.requesterId,
        requesterUsername: request.requester.username,
        status: request.status,
        createdAt: request.createdAt
      }))
    });
  } catch (error) {
    console.error("Failed to get access requests", error);
    return res.status(400).json({ error: "Failed to get access requests" });
  }
});

app.post("/api/notes/access-requests/:requestId/approve", async (req: Request, res: Response) => {
  try {
    const userId = await getCurrentUserId();
    const { requestId } = req.params;

    const accessRequest = await prisma.noteAccessRequest.findUnique({
      where: { id: requestId },
      include: { note: true }
    });

    if (!accessRequest) {
      return res.status(404).json({ error: "Request not found" });
    }

    if (accessRequest.note.userId !== userId) {
      return res.status(403).json({ error: "Only the note owner can approve access" });
    }

    const updatedRequest = await prisma.noteAccessRequest.update({
      where: { id: requestId },
      data: { status: "approved" }
    });

    await prisma.noteAccess.upsert({
      where: {
        noteId_userId: {
          noteId: accessRequest.noteId,
          userId: accessRequest.requesterId
        }
      },
      update: { grantedAt: new Date() },
      create: {
        noteId: accessRequest.noteId,
        userId: accessRequest.requesterId
      }
    });

    return res.json({ request: updatedRequest });
  } catch (error) {
    return res.status(400).json({ error: "Failed to approve request" });
  }
});

app.post("/api/notes/access-requests/:requestId/reject", async (req: Request, res: Response) => {
  try {
    const userId = await getCurrentUserId();
    const { requestId } = req.params;

    const accessRequest = await prisma.noteAccessRequest.findUnique({
      where: { id: requestId },
      include: { note: true }
    });

    if (!accessRequest) {
      return res.status(404).json({ error: "Request not found" });
    }

    if (accessRequest.note.userId !== userId) {
      return res.status(403).json({ error: "Only the note owner can reject access" });
    }

    const updatedRequest = await prisma.noteAccessRequest.update({
      where: { id: requestId },
      data: { status: "rejected" }
    });

    return res.json({ request: updatedRequest });
  } catch (error) {
    console.error("Failed to reject request", error);
    return res.status(400).json({ error: "Failed to reject request" });
  }
});

// ===== STUDY GROUPS ROUTES =====

// Get Groups
app.get("/api/groups", async (req: Request, res: Response) => {
  try {
    void req;
    const groups = await prisma.studyGroup.findMany({
      include: { members: true, creator: true },
    });

    res.json({ groups });
  } catch (error) {
    res.status(400).json({ error: "Failed to get groups" });
  }
});

// Create Group
app.post("/api/groups", async (req: Request, res: Response) => {
  try {
    const userId = await getCurrentUserId();
    const { name, topic, description, invitedUserIds } = req.body as {
      name?: string;
      topic?: string;
      description?: string;
      invitedUserIds?: string[];
    };

    const memberIds = Array.from(new Set([userId, ...((invitedUserIds || []).filter(Boolean))]));

    const group = await prisma.studyGroup.create({
      data: {
        name: name?.trim() || "Study Group",
        topic: topic?.trim() || "general",
        description: description?.trim() || null,
        creatorId: userId,
        members: {
          create: memberIds.map((memberUserId) => ({ userId: memberUserId }))
        }
      },
      include: { members: true, creator: true },
    });

    res.status(201).json({ group });
  } catch (error) {
    res.status(400).json({ error: "Failed to create group" });
  }
});

// Join Group
app.post("/api/groups/:groupId/join", async (req: Request, res: Response) => {
  try {
    const userId = await getCurrentUserId();
    const { groupId } = req.params;

    await prisma.groupMember.upsert({
      where: {
        groupId_userId: { groupId, userId }
      },
      update: {},
      create: { groupId, userId }
    });

    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: "Failed to join group" });
  }
});

// ===== STUDY SESSION ROUTES =====

app.post("/api/study-sessions/start", async (req: Request, res: Response) => {
  try {
    const userId = await getCurrentUserId();
    const { groupId } = req.body as { groupId?: string };
    let targetGroupId = groupId?.trim() || "";

    if (!targetGroupId) {
      const existingPersonalGroup = await prisma.studyGroup.findFirst({
        where: {
          creatorId: userId,
          name: "Personal Study Session",
          topic: "personal"
        }
      });

      if (existingPersonalGroup) {
        targetGroupId = existingPersonalGroup.id;
      } else {
        const personalGroup = await prisma.studyGroup.create({
          data: {
            name: "Personal Study Session",
            topic: "personal",
            description: "Auto-created group for individual study tracker sessions",
            creatorId: userId,
            members: { create: { userId } }
          }
        });
        targetGroupId = personalGroup.id;
      }
    }

    await prisma.groupMember.upsert({
      where: { groupId_userId: { groupId: targetGroupId, userId } },
      update: {},
      create: { groupId: targetGroupId, userId }
    });

    const session = await prisma.studySession.create({
      data: {
        groupId: targetGroupId,
        startTime: new Date(),
        participants: { create: { userId } }
      }
    });

    return res.status(201).json({
      session: {
        id: session.id,
        groupId: session.groupId,
        startTime: session.startTime
      }
    });
  } catch (error) {
    console.error("Failed to start study session", error);
    return res.status(400).json({ error: "Failed to start study session" });
  }
});

app.post("/api/study-sessions/:sessionId/end", async (req: Request, res: Response) => {
  try {
    void req;
    const userId = await getCurrentUserId();
    const { sessionId } = req.params;

    const session = await prisma.studySession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      return res.status(404).json({ error: "Study session not found" });
    }

    if (session.endTime) {
      const totals = await prisma.user.findUnique({
        where: { id: userId },
        select: { totalStudyMinutes: true, totalXp: true }
      });

      return res.json({ totals: totals ?? { totalStudyMinutes: 0, totalXp: 0 } });
    }

    const endTime = new Date();
    const durationMinutes = Math.max(1, Math.round((endTime.getTime() - session.startTime.getTime()) / 60000));
    const xpEarned = Math.max(10, durationMinutes * 2);

    await prisma.studySession.update({
      where: { id: sessionId },
      data: { endTime, durationMinutes }
    });

    await prisma.studySessionMember.upsert({
      where: { sessionId_userId: { sessionId, userId } },
      update: { minutesStudied: durationMinutes, xpEarned },
      create: { sessionId, userId, minutesStudied: durationMinutes, xpEarned }
    });

    const totals = await prisma.user.update({
      where: { id: userId },
      data: {
        totalStudyMinutes: { increment: durationMinutes },
        totalXp: { increment: xpEarned }
      },
      select: { totalStudyMinutes: true, totalXp: true }
    });

    return res.json({ totals });
  } catch (error) {
    console.error("Failed to end study session", error);
    return res.status(400).json({ error: "Failed to end study session" });
  }
});

app.get("/api/debug/database-summary", async (req: Request, res: Response) => {
  try {
    void req;
    const userId = await getCurrentUserId();
    const [users, groups, groupMembers, sessions, notes, messages, friendRequests] = await Promise.all([
      prisma.user.count(),
      prisma.studyGroup.count(),
      prisma.groupMember.count(),
      prisma.studySession.count(),
      prisma.note.count(),
      prisma.message.count(),
      prisma.friendRequest.count()
    ]);

    return res.json({
      currentUserId: userId,
      counts: { users, groups, groupMembers, sessions, notes, messages, friendRequests }
    });
  } catch (error) {
    console.error("Failed to read database summary", error);
    return res.status(400).json({ error: "Failed to read database summary" });
  }
});

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled API error", error);
  return res.status(500).json({ error: error.message || "Internal server error" });
});

// ===== START SERVER =====

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
