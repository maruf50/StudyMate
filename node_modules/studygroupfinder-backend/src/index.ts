import express, { Express, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

dotenv.config();

const app: Express = express();
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString })
});

async function getDemoUserId() {
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
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get("/api/health", (req: Request, res: Response) => {
  void req;
  res.json({ status: "ok", message: "Server is running" });
});

// ===== USER ROUTES =====

// Register
app.post("/api/auth/register", async (req: Request, res: Response) => {
  try {
    const { email, username, password, university, department } = req.body;

    const user = await prisma.user.create({
      data: {
        email,
        username,
        password, // In production, hash this with bcryptjs
        university,
        department,
      },
    });

    res.status(201).json({ user, token: "mock-token" });
  } catch (error) {
    res.status(400).json({ error: "Registration failed" });
  }
});

// Login
app.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    void password;
    return res.json({ user, token: "mock-token" });
  } catch (error) {
    return res.status(400).json({ error: "Login failed" });
  }
});

// Get Current User
app.get("/api/auth/me", async (req: Request, res: Response) => {
  try {
    void req;
    const userId = await getDemoUserId();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        interests: true,
        availability: true,
      },
    });

    res.json({ user });
  } catch (error) {
    res.status(400).json({ error: "Failed to get user" });
  }
});

app.get("/api/stats/me", async (req: Request, res: Response) => {
  try {
    void req;
    const userId = await getDemoUserId();

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
    const currentUserId = await getDemoUserId();

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
    const userId = await getDemoUserId();
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
    const userId = await getDemoUserId();

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
    const requesterId = await getDemoUserId();
    const { targetUserId } = req.body;

    if (!targetUserId || targetUserId === requesterId) {
      return res.status(400).json({ error: "Invalid friend request target" });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });

    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const existing = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { requesterId, addresseeId: targetUserId },
          { requesterId: targetUserId, addresseeId: requesterId }
        ]
      },
      include: {
        requester: true,
        addressee: true
      }
    });

    if (existing) {
      if (existing.status === "pending" && existing.requesterId === targetUserId && existing.addresseeId === requesterId) {
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
        addresseeId: targetUserId,
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
    const userId = await getDemoUserId();

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
    const userId = await getDemoUserId();

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
    const userId = await getDemoUserId();

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
    const userId = await getDemoUserId();
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
    const userId = await getDemoUserId();
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
    const userId = await getDemoUserId();
    const friendIds = await getAcceptedFriendIds(userId);

    const notes = await prisma.note.findMany({
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
    const userId = await getDemoUserId();
    const { title, isPrivate, content } = req.body;

    const note = await prisma.note.create({
      data: {
        userId,
        title,
        isPrivate,
        content: {
          create: content.map((block: any, index: number) => ({
            type: block.type,
            content: block.content,
            metadata: block.metadata,
            order: index,
          })),
        },
      },
      include: { content: true },
    });

    return res.status(201).json({ note });
  } catch (error) {
    return res.status(400).json({ error: "Failed to create note" });
  }
});

// Update Note Privacy
app.put("/api/notes/:noteId/privacy", async (req: Request, res: Response) => {
  try {
    const { noteId } = req.params;
    const { isPrivate } = req.body;

    const note = await prisma.note.update({
      where: { id: noteId },
      data: { isPrivate },
    });

    return res.json({ note });
  } catch (error) {
    return res.status(400).json({ error: "Failed to update note privacy" });
  }
});

app.post("/api/notes/:noteId/request-access", async (req: Request, res: Response) => {
  try {
    void req;
    const userId = await getDemoUserId();
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
    const { noteId } = req.params;
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
    return res.status(400).json({ error: "Failed to get access requests" });
  }
});

app.post("/api/notes/access-requests/:requestId/approve", async (req: Request, res: Response) => {
  try {
    void req;
    const { requestId } = req.params;

    const accessRequest = await prisma.noteAccessRequest.findUnique({
      where: { id: requestId },
      include: { note: true }
    });

    if (!accessRequest) {
      return res.status(404).json({ error: "Request not found" });
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
    void req;
    const { requestId } = req.params;

    const updatedRequest = await prisma.noteAccessRequest.update({
      where: { id: requestId },
      data: { status: "rejected" }
    });

    return res.json({ request: updatedRequest });
  } catch (error) {
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
    const userId = await getDemoUserId();
    const { name, topic, description } = req.body;

    const group = await prisma.studyGroup.create({
      data: {
        name,
        topic,
        description,
        creatorId: userId,
        members: {
          create: { userId },
        },
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
    const userId = await getDemoUserId();
    const { groupId } = req.params;

    await prisma.groupMember.create({
      data: { groupId, userId },
    });

    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: "Failed to join group" });
  }
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
