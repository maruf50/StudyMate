import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString })
});

async function main() {
  console.log("Seeding database...");

  // Clear existing data
  await prisma.userMatch.deleteMany();
  await prisma.friendRequest.deleteMany();
  await prisma.message.deleteMany();
  await prisma.studySessionMember.deleteMany();
  await prisma.studySession.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.studyGroup.deleteMany();
  await prisma.noteAccessRequest.deleteMany();
  await prisma.noteAccess.deleteMany();
  await prisma.noteContent.deleteMany();
  await prisma.note.deleteMany();
  await prisma.availabilitySlot.deleteMany();
  await prisma.userInterest.deleteMany();
  await prisma.user.deleteMany();

  // Create demo users
  const user1 = await prisma.user.create({
    data: {
      email: "demo@studygroupfinder.app",
      username: "Demo Student",
      password: "demo123", // In production, hash this!
      university: "Demo University",
      department: "Computer Science",
      totalXp: 120,
      totalStudyMinutes: 300,
      interests: {
        create: [
          { topic: "math", level: "intermediate" },
          { topic: "physics", level: "beginner" },
        ],
      },
      availability: {
        create: [
          { day: "mon", startHour: 18, endHour: 21 },
          { day: "wed", startHour: 18, endHour: 21 },
        ],
      },
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: "alice@example.com",
      username: "Alice",
      password: "alice123",
      university: "Demo University",
      department: "Mathematics",
      totalXp: 85,
      totalStudyMinutes: 250,
      interests: {
        create: [
          { topic: "math", level: "advanced" },
          { topic: "physics", level: "intermediate" },
        ],
      },
      availability: {
        create: [
          { day: "mon", startHour: 19, endHour: 22 },
          { day: "fri", startHour: 17, endHour: 20 },
        ],
      },
    },
  });

  const user3 = await prisma.user.create({
    data: {
      email: "bob@example.com",
      username: "Bob",
      password: "bob123",
      university: "Demo University",
      department: "Computer Science",
      totalXp: 200,
      totalStudyMinutes: 450,
      interests: {
        create: [
          { topic: "programming", level: "advanced" },
          { topic: "math", level: "beginner" },
        ],
      },
      availability: {
        create: [
          { day: "tue", startHour: 20, endHour: 23 },
          { day: "sat", startHour: 10, endHour: 14 },
        ],
      },
    },
  });

  // Create sample notes
  await prisma.note.create({
    data: {
      userId: user1.id,
      title: "Calculus Study Guide",
      isPrivate: false,
      content: {
        create: [
          {
            type: "text",
            content: "Chapter 1: Limits and Continuity. Key concepts to remember...",
            metadata: "Introduction",
            order: 0,
          },
          {
            type: "text",
            content: "Important theorems and their applications in real-world problems",
            order: 1,
          },
          {
            type: "link",
            content: "https://www.khanacademy.org/math/calculus-1",
            metadata: "Khan Academy Calculus",
            order: 2,
          },
        ],
      },
    },
  });

  const note2 = await prisma.note.create({
    data: {
      userId: user1.id,
      title: "Private Exam Notes",
      isPrivate: true,
      content: {
        create: [
          {
            type: "text",
            content: "My personal study notes for the upcoming exam",
            order: 0,
          },
        ],
      },
    },
  });

  const note3 = await prisma.note.create({
    data: {
      userId: user2.id,
      title: "Alice's Private Review",
      isPrivate: true,
      content: {
        create: [
          {
            type: "text",
            content: "These are Alice's private study reminders for calculus and physics.",
            order: 0,
          },
        ],
      },
    },
  });
  void note3;

  await prisma.note.create({
    data: {
      userId: user2.id,
      title: "Alice's Public Study Tips",
      isPrivate: false,
      content: {
        create: [
          {
            type: "text",
            content: "Public notes work best when they are short, structured, and easy to skim.",
            order: 0,
          },
          {
            type: "link",
            content: "https://www.khanacademy.org/",
            metadata: "Learning resource",
            order: 1,
          },
        ],
      },
    },
  });

  // Create study groups
  const group1 = await prisma.studyGroup.create({
    data: {
      name: "Algebra Team",
      topic: "math",
      description: "Evening algebra practice sessions",
      creatorId: user1.id,
      members: {
        create: [
          { userId: user1.id },
          { userId: user2.id },
          { userId: user3.id },
        ],
      },
    },
  });

  await prisma.studyGroup.create({
    data: {
      name: "Programming Workshop",
      topic: "programming",
      description: "Learn programming together",
      creatorId: user3.id,
      members: {
        create: [{ userId: user3.id }, { userId: user1.id }],
      },
    },
  });

  // Create study session
  await prisma.studySession.create({
    data: {
      groupId: group1.id,
      startTime: new Date(),
      participants: {
        create: [
          { userId: user1.id, minutesStudied: 60, xpEarned: 50 },
          { userId: user2.id, minutesStudied: 45, xpEarned: 35 },
        ],
      },
    },
  });

  // Create messages
  await prisma.message.create({
    data: {
      content: "Welcome to Algebra Team!",
      userId: user1.id,
      groupId: group1.id,
    },
  });

  await prisma.message.create({
    data: {
      content: "Looking forward to studying with you all!",
      userId: user2.id,
      groupId: group1.id,
    },
  });

  // Create user match (compatibility score)
  await prisma.userMatch.create({
    data: {
      user1Id: user1.id,
      user2Id: user2.id,
      matchScore: 85.5,
    },
  });

  await prisma.userMatch.create({
    data: {
      user1Id: user1.id,
      user2Id: user3.id,
      matchScore: 72.0,
    },
  });

  // Create sample access request
  await prisma.noteAccessRequest.create({
    data: {
      noteId: note2.id,
      requesterId: user2.id,
      status: "pending",
    },
  });

  await prisma.friendRequest.create({
    data: {
      requesterId: user2.id,
      addresseeId: user1.id,
      status: "accepted",
    },
  });

  await prisma.friendRequest.create({
    data: {
      requesterId: user3.id,
      addresseeId: user1.id,
      status: "pending",
    },
  });

  await prisma.friendRequest.create({
    data: {
      requesterId: user3.id,
      addresseeId: user2.id,
      status: "pending",
    },
  });

  console.log("Database seeded successfully!");
  console.log("\nSeeded data:");
  console.log(`  - ${3} users`);
  console.log(`  - ${2} study groups`);
  console.log(`  - ${3} notes`);
  console.log(`  - ${2} user matches`);
  console.log(`  - ${1} access request`);
  console.log(`  - ${3} friend requests`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
