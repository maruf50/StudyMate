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

  const headerUserId = req?.header("x-user-id")?.trim();

  if (!headerUserId) {
    throw new Error("Authentication required");
  }

  const user = await prisma.user.findUnique({ where: { id: headerUserId } });

  if (!user) {
    throw new Error("Invalid authenticated user");
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

function normalizeTopic(topic: unknown) {
  if (typeof topic !== "string") {
    return "";
  }

  return topic.trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeLevel(level: unknown) {
  return level === "beginner" || level === "advanced" || level === "intermediate" ? level : "intermediate";
}

function normalizeProfileInterests(interests: unknown) {
  if (!Array.isArray(interests)) {
    return [];
  }

  const seen = new Set<string>();
  const normalized: Array<{ topic: string; level: string }> = [];

  for (const item of interests) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const entry = item as { topic?: unknown; level?: unknown };
    const topic = normalizeTopic(entry.topic);

    if (!topic || seen.has(topic)) {
      continue;
    }

    seen.add(topic);
    normalized.push({ topic, level: normalizeLevel(entry.level) });
  }

  return normalized;
}

function normalizeAvailabilitySlots(availability: unknown) {
  if (!Array.isArray(availability)) {
    return [];
  }

  const validDays = new Set(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
  const seen = new Set<string>();
  const normalized: Array<{ day: string; startHour: number; endHour: number }> = [];

  for (const item of availability) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const slot = item as { day?: unknown; startHour?: unknown; endHour?: unknown };
    const day = typeof slot.day === "string" ? slot.day.trim().toLowerCase() : "";
    const startHour = Number(slot.startHour);
    const endHour = Number(slot.endHour);

    if (!validDays.has(day) || seen.has(day) || !Number.isInteger(startHour) || !Number.isInteger(endHour)) {
      continue;
    }

    if (startHour < 0 || endHour > 24 || startHour >= endHour) {
      continue;
    }

    seen.add(day);
    normalized.push({ day, startHour, endHour });
  }

  return normalized;
}

function getFriendshipStatus(
  relationship: { id: string; requesterId: string; addresseeId: string; status: string } | undefined,
  currentUserId: string
) {
  if (!relationship || relationship.status === "rejected") {
    return "none";
  }

  if (relationship.status === "accepted") {
    return "friends";
  }

  if (relationship.status === "pending" && relationship.requesterId === currentUserId) {
    return "pending_outgoing";
  }

  if (relationship.status === "pending" && relationship.addresseeId === currentUserId) {
    return "pending_incoming";
  }

  return relationship.status;
}

type NoteBlockInput = {
  id?: string;
  type?: string;
  content?: string;
  metadata?: string | null;
};

type NoteWithRelations = {
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
};

const noteInclude = {
  content: true,
  user: true,
  accessRequests: true,
  allowedUsers: true
};

function normalizeNoteContent(content: unknown): Array<{ type: string; content: string; metadata: string | null }> {
  if (!Array.isArray(content)) {
    return [];
  }

  return content
    .filter((block): block is NoteBlockInput => Boolean(block) && typeof block === "object")
    .map((block) => {
      const type = block.type === "image" || block.type === "link" ? block.type : "text";

      return {
        type,
        content: typeof block.content === "string" ? block.content : "",
        metadata: typeof block.metadata === "string" && block.metadata.trim() ? block.metadata.trim() : null
      };
    });
}

function serializeNote(note: NoteWithRelations, currentUserId: string, friendIds: Set<string>) {
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
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
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
const configuredOrigins = new Set(
  (process.env.CORS_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

function isAllowedDevOrigin(origin: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1):(\d+)$/.test(origin);
}

app.use(cors({
  origin(origin, callback) {
    // Allow REST clients, same-origin calls, configured production origins,
    // and any local Vite development port. This prevents browser "Failed to fetch"
    // errors when Vite moves from 5173 to 5174/5175 after a port is busy.
    if (!origin || configuredOrigins.has(origin) || isAllowedDevOrigin(origin)) {
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
    (req.method === "GET" && req.path === "/") ||
    (req.method === "GET" && req.path === "/api/health") ||
    (req.method === "POST" && req.path === "/api/auth/register") ||
    (req.method === "POST" && req.path === "/api/auth/login")
  );
}

app.use(async (req, res, next) => {
  if (isPublicRoute(req)) {
    return next();
  }

  try {
    const currentUserId = await getCurrentUserId(req);
    requestContext.run({ userId: currentUserId }, () => next());
  } catch (error) {
    return res.status(401).json({ error: "Please log in again before using this feature" });
  }
});

// Backend Home Route
app.get("/", (req: Request, res: Response) => {
  void req;
  res.json({
    status: "ok",
    message: "StudyMate backend is running",
    health: "/api/health"
  });
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

app.get("/api/users/search", async (req: Request, res: Response) => {
  try {
    const currentUserId = await getCurrentUserId();
    const query = typeof req.query.q === "string" ? req.query.q.trim() : "";

    if (query.length < 2) {
      return res.json({ users: [] });
    }

    const [users, friendRequests] = await Promise.all([
      prisma.user.findMany({
        where: {
          id: { not: currentUserId },
          OR: [
            { username: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { university: { contains: query, mode: "insensitive" } },
            { department: { contains: query, mode: "insensitive" } }
          ]
        },
        include: { interests: true },
        orderBy: { username: "asc" },
        take: 10
      }),
      prisma.friendRequest.findMany({
        where: {
          OR: [{ requesterId: currentUserId }, { addresseeId: currentUserId }]
        }
      })
    ]);

    const relationshipByUserId = new Map<string, { id: string; requesterId: string; addresseeId: string; status: string }>();

    for (const request of friendRequests) {
      const otherUserId = request.requesterId === currentUserId ? request.addresseeId : request.requesterId;
      relationshipByUserId.set(otherUserId, request);
    }

    return res.json({
      users: users.map((user) => {
        const relationship = relationshipByUserId.get(user.id);
        const friendshipStatus = getFriendshipStatus(relationship, currentUserId);

        return {
          id: user.id,
          username: user.username,
          email: user.email,
          university: user.university ?? "",
          department: user.department ?? "",
          friendshipStatus,
          requestId: relationship?.status === "pending" ? relationship.id : undefined,
          interests: user.interests.map((interest) => ({ topic: interest.topic, level: interest.level }))
        };
      })
    });
  } catch (error) {
    console.error("Failed to search users", error);
    return res.status(400).json({ error: "Failed to search users" });
  }
});

app.get("/api/matches/users", async (req: Request, res: Response) => {
  try {
    const currentUserId = await getCurrentUserId();
    const selectedInterest = typeof req.query.interest === "string" ? normalizeTopic(req.query.interest) : "";

    const [currentUser, users, friendRequests] = await Promise.all([
      prisma.user.findUnique({
        where: { id: currentUserId },
        include: { interests: true }
      }),
      prisma.user.findMany({
        where: { id: { not: currentUserId } },
        include: { interests: true },
        orderBy: { username: "asc" }
      }),
      prisma.friendRequest.findMany({
        where: {
          OR: [{ requesterId: currentUserId }, { addresseeId: currentUserId }]
        }
      })
    ]);

    if (!currentUser) {
      return res.status(404).json({ error: "Current user not found" });
    }

    const currentTopics = new Set(currentUser.interests.map((interest) => normalizeTopic(interest.topic)));
    const relationshipByUserId = new Map<string, { id: string; requesterId: string; addresseeId: string; status: string }>();

    for (const request of friendRequests) {
      const otherUserId = request.requesterId === currentUserId ? request.addresseeId : request.requesterId;
      relationshipByUserId.set(otherUserId, request);
    }

    const matches = users
      .filter((candidate) => {
        if (!selectedInterest) {
          return true;
        }

        return candidate.interests.some((interest) => normalizeTopic(interest.topic) === selectedInterest);
      })
      .map((candidate) => {
        const candidateTopics = candidate.interests.map((interest) => normalizeTopic(interest.topic)).filter(Boolean);
        const commonInterests = candidateTopics.filter((topic) => currentTopics.has(topic));
        const friendshipStatus = getFriendshipStatus(relationshipByUserId.get(candidate.id), currentUserId);

        let score = 40;
        score += commonInterests.length * 25;
        score += Math.min(candidateTopics.length, 4) * 4;

        if (currentUser.university && candidate.university && currentUser.university === candidate.university) {
          score += 10;
        }

        if (currentUser.department && candidate.department && currentUser.department === candidate.department) {
          score += 10;
        }

        if (friendshipStatus === "friends") {
          score += 8;
        }

        if (selectedInterest && candidateTopics.includes(selectedInterest)) {
          score += 12;
        }

        if (currentTopics.size === 0 && candidateTopics.length > 0) {
          score = Math.max(score, 55);
        }

        return {
          userId: candidate.id,
          username: candidate.username,
          university: candidate.university ?? "",
          department: candidate.department ?? "",
          score: Math.min(100, Math.round(score)),
          friendshipStatus,
          commonInterests,
          interests: candidate.interests.map((interest) => ({ topic: interest.topic, level: interest.level }))
        };
      })
      .sort((left, right) => right.score - left.score || left.username.localeCompare(right.username));

    return res.json({ matches });
  } catch (error) {
    console.error("Failed to get matches", error);
    return res.status(400).json({ error: "Failed to get matches" });
  }
});

app.put("/api/profile", async (req: Request, res: Response) => {
  try {
    const userId = await getCurrentUserId();
    const { university, department, interests, availability } = req.body as {
      university?: string;
      department?: string;
      interests?: unknown;
      availability?: unknown;
    };

    const normalizedInterests = normalizeProfileInterests(interests);
    const normalizedAvailability = normalizeAvailabilitySlots(availability);

    const updatedUser = await prisma.$transaction(async (tx) => {
      await tx.userInterest.deleteMany({ where: { userId } });
      await tx.availabilitySlot.deleteMany({ where: { userId } });

      return tx.user.update({
        where: { id: userId },
        data: {
          university: university?.trim() || null,
          department: department?.trim() || null,
          interests: {
            create: normalizedInterests
          },
          availability: {
            create: normalizedAvailability
          }
        },
        include: {
          interests: true,
          availability: true
        }
      });
    });

    return res.json({ user: serializeUser(updatedUser) });
  } catch (error) {
    console.error("Failed to update profile", error);
    return res.status(400).json({ error: "Failed to update profile" });
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
    const { targetUserId, targetUsername } = req.body as { targetUserId?: string; targetUsername?: string };
    const targetIdentifier = (targetUserId || targetUsername || "").trim();

    if (!targetIdentifier) {
      return res.status(400).json({ error: "Enter a valid username, email, or user ID" });
    }

    const targetUser = await prisma.user.findFirst({
      where: {
        OR: [
          { id: targetIdentifier },
          { username: { equals: targetIdentifier, mode: "insensitive" } },
          { email: { equals: targetIdentifier, mode: "insensitive" } }
        ]
      }
    });

    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (targetUser.id === requesterId) {
      return res.status(400).json({ error: "You cannot send a friend request to yourself" });
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
      if (existing.status === "accepted") {
        return res.json({ request: serializeFriendRequest(existing), message: "Already friends" });
      }

      if (existing.status === "pending" && existing.requesterId === targetUser.id && existing.addresseeId === requesterId) {
        const accepted = await prisma.friendRequest.update({
          where: { id: existing.id },
          data: { status: "accepted" },
          include: { requester: true, addressee: true }
        });

        return res.json({ request: serializeFriendRequest(accepted), message: "Existing incoming request accepted" });
      }

      if (existing.status === "pending") {
        return res.json({ request: serializeFriendRequest(existing), message: "Friend request already pending" });
      }

      const renewed = await prisma.friendRequest.update({
        where: { id: existing.id },
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

      return res.json({ request: serializeFriendRequest(renewed), message: "Friend request sent again" });
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

    return res.status(201).json({ request: serializeFriendRequest(request), message: "Friend request sent" });
  } catch (error) {
    console.error("Failed to create friend request", error);
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

    const friendMap = new Map<string, { id: string; username: string; userId: string }>();

    for (const request of requests) {
      const friendUser = request.requesterId === userId ? request.addressee : request.requester;
      if (!friendMap.has(friendUser.id)) {
        friendMap.set(friendUser.id, {
          id: friendUser.id,
          username: friendUser.username,
          userId: friendUser.id
        });
      }
    }

    return res.json({ friends: Array.from(friendMap.values()) });
  } catch (error) {
    return res.status(400).json({ error: "Failed to get friends" });
  }
});


// Remove an accepted friend connection. This deletes the accepted friendship row between the current user and the selected friend.
app.delete("/api/friends/:friendUserId", async (req: Request, res: Response) => {
  try {
    const userId = await getCurrentUserId();
    const { friendUserId } = req.params;

    if (!friendUserId || friendUserId === userId) {
      return res.status(400).json({ error: "Invalid friend" });
    }

    const deleted = await prisma.friendRequest.deleteMany({
      where: {
        status: "accepted",
        OR: [
          { requesterId: userId, addresseeId: friendUserId },
          { requesterId: friendUserId, addresseeId: userId }
        ]
      }
    });

    if (deleted.count === 0) {
      return res.status(404).json({ error: "Friend connection not found" });
    }

    return res.json({ ok: true, friendUserId });
  } catch (error) {
    console.error("Failed to unfriend user", error);
    return res.status(400).json({ error: "Failed to unfriend user" });
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

// Get all notes visible to the current user.
// Visible notes are: own notes, public notes, notes shared by accepted friends, and notes with approved explicit access.
app.get("/api/notes", async (req: Request, res: Response) => {
  try {
    void req;
    const userId = await getCurrentUserId();
    const friendIds = await getAcceptedFriendIds(userId);

    const visibilityFilters: any[] = [
      { userId },
      { isPrivate: false },
      {
        allowedUsers: {
          some: { userId }
        }
      }
    ];

    if (friendIds.size > 0) {
      visibilityFilters.push({ userId: { in: Array.from(friendIds) } });
    }

    const notes = await prisma.note.findMany({
      where: {
        OR: visibilityFilters
      },
      include: noteInclude,
      orderBy: { updatedAt: "desc" }
    });

    const visibleNotes = notes
      .map((note) => serializeNote(note, userId, friendIds))
      .filter((note): note is NonNullable<ReturnType<typeof serializeNote>> => Boolean(note));

    return res.json({ notes: visibleNotes });
  } catch (error) {
    console.error("Failed to get notes", error);
    return res.status(400).json({ error: "Failed to get notes" });
  }
});

// Create Note
app.post("/api/notes", async (req: Request, res: Response) => {
  try {
    const userId = await getCurrentUserId();
    const { title, isPrivate, content } = req.body as {
      title?: string;
      isPrivate?: boolean;
      content?: unknown;
    };
    const normalizedContent = normalizeNoteContent(content);

    const note = await prisma.note.create({
      data: {
        userId,
        title: title?.trim() || "Untitled note",
        isPrivate: Boolean(isPrivate),
        content: {
          create: normalizedContent.map((block, index) => ({
            type: block.type,
            content: block.content,
            metadata: block.metadata,
            order: index
          }))
        }
      },
      include: noteInclude
    });

    return res.status(201).json({ note: serializeNote(note, userId, new Set<string>()) });
  } catch (error) {
    console.error("Failed to create note", error);
    return res.status(400).json({ error: "Failed to create note" });
  }
});

// Update full Note: title, privacy, and content blocks.
app.put("/api/notes/:noteId", async (req: Request, res: Response) => {
  try {
    const userId = await getCurrentUserId();
    const { noteId } = req.params;
    const { title, isPrivate, content } = req.body as {
      title?: string;
      isPrivate?: boolean;
      content?: unknown;
    };

    const existingNote = await prisma.note.findUnique({ where: { id: noteId } });

    if (!existingNote) {
      return res.status(404).json({ error: "Note not found" });
    }

    if (existingNote.userId !== userId) {
      return res.status(403).json({ error: "Only the note owner can edit this note" });
    }

    const normalizedContent = normalizeNoteContent(content);

    const note = await prisma.$transaction(async (tx) => {
      await tx.noteContent.deleteMany({ where: { noteId } });

      return tx.note.update({
        where: { id: noteId },
        data: {
          title: title?.trim() || "Untitled note",
          isPrivate: Boolean(isPrivate),
          content: {
            create: normalizedContent.map((block, index) => ({
              type: block.type,
              content: block.content,
              metadata: block.metadata,
              order: index
            }))
          }
        },
        include: noteInclude
      });
    });

    return res.json({ note: serializeNote(note, userId, new Set<string>()) });
  } catch (error) {
    console.error("Failed to update note", error);
    return res.status(400).json({ error: "Failed to update note" });
  }
});

// Delete Note
app.delete("/api/notes/:noteId", async (req: Request, res: Response) => {
  try {
    const userId = await getCurrentUserId();
    const { noteId } = req.params;

    const existingNote = await prisma.note.findUnique({ where: { id: noteId } });

    if (!existingNote) {
      return res.status(404).json({ error: "Note not found" });
    }

    if (existingNote.userId !== userId) {
      return res.status(403).json({ error: "Only the note owner can delete this note" });
    }

    await prisma.note.delete({ where: { id: noteId } });

    return res.json({ ok: true, noteId });
  } catch (error) {
    console.error("Failed to delete note", error);
    return res.status(400).json({ error: "Failed to delete note" });
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
      data: { isPrivate: Boolean(isPrivate) },
      include: noteInclude
    });

    return res.json({ note: serializeNote(note, userId, new Set<string>()) });
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
    console.error("Failed to request access", error);
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
    console.error("Failed to approve request", error);
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

// Delete Group. Only the creator can delete a group.
app.delete("/api/groups/:groupId", async (req: Request, res: Response) => {
  try {
    const userId = await getCurrentUserId();
    const { groupId } = req.params;

    const group = await prisma.studyGroup.findUnique({ where: { id: groupId } });

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (group.creatorId !== userId) {
      return res.status(403).json({ error: "Only the group creator can delete this group" });
    }

    const sessions = await prisma.studySession.findMany({
      where: { groupId },
      select: { id: true }
    });
    const sessionIds = sessions.map((session) => session.id);

    await prisma.$transaction(async (tx) => {
      if (sessionIds.length > 0) {
        await tx.studySessionMember.deleteMany({ where: { sessionId: { in: sessionIds } } });
        await tx.studySession.deleteMany({ where: { id: { in: sessionIds } } });
      }

      await tx.message.deleteMany({ where: { groupId } });
      await tx.groupMember.deleteMany({ where: { groupId } });
      await tx.studyGroup.delete({ where: { id: groupId } });
    });

    return res.json({ ok: true, groupId });
  } catch (error) {
    console.error("Failed to delete group", error);
    return res.status(400).json({ error: "Failed to delete group" });
  }
});

// Join Group
app.post("/api/groups/:groupId/join", async (req: Request, res: Response) => {
  try {
    const userId = await getCurrentUserId();
    const { groupId } = req.params;

    const group = await prisma.studyGroup.findUnique({
      where: { id: groupId },
      include: { members: true, creator: true }
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    const alreadyMember = group.members.some((member) => member.userId === userId);

    if (!alreadyMember && group.members.length >= group.maxMembers) {
      return res.status(400).json({ error: "Group is already full" });
    }

    if (!alreadyMember) {
      await prisma.groupMember.upsert({
        where: { groupId_userId: { groupId, userId } },
        update: {},
        create: { groupId, userId }
      });
    }

    const updatedGroup = await prisma.studyGroup.findUnique({
      where: { id: groupId },
      include: { members: true, creator: true }
    });

    return res.json({ ok: true, group: updatedGroup });
  } catch (error) {
    return res.status(400).json({ error: "Failed to join group" });
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
        startTime: session.startTime,
        startedAt: session.startTime
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
