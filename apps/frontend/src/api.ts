// Frontend-only mock API (no backend required)
export type User = {
  id: string;
  email: string;
  username: string;
  university: string;
  department: string;
  totalXp: number;
  totalStudyMinutes: number;
  interests: Array<{ topic: string; level: "beginner" | "intermediate" | "advanced" }>;
  availability: Array<{ day: string; startHour: number; endHour: number }>;
};

type Group = { id: string; name: string; topic: string; description: string; memberIds: string[] };
type Note = { id: string; userId: string; title: string; content: string; links: string[]; updatedAt: string };
type Message = { id: string; userId: string; username: string; groupId: string | null; content: string; createdAt: string };

const demoUser: User = {
  id: "user-demo",
  email: "demo@studygroupfinder.app",
  username: "Demo Student",
  university: "Demo University",
  department: "Computer Science",
  totalXp: 120,
  totalStudyMinutes: 300,
  interests: [{ topic: "math", level: "intermediate" }],
  availability: [{ day: "mon", startHour: 18, endHour: 21 }]
};

const store = {
  user: { ...demoUser },
  matches: [
    { userId: "u1", username: "Alice", interests: [{ topic: "math", level: "intermediate" }] },
    { userId: "u2", username: "Bob", interests: [{ topic: "physics", level: "beginner" }] },
    { userId: "u3", username: "Charlie", interests: [{ topic: "math", level: "advanced" }] }
  ],
  groups: [
    { id: "g1", name: "Algebra Team", topic: "math", description: "Evening practice", memberIds: ["user-demo"] }
  ] as Group[],
  notes: [] as Note[],
  stats: { totalXp: demoUser.totalXp, totalStudyMinutes: demoUser.totalStudyMinutes },
  messages: { global: [] as Message[], groups: {} as Record<string, Message[]> }
};

function delay<T>(value: T, ms = 200) {
  return new Promise<T>((res) => setTimeout(() => res(value), ms));
}

export async function register(payload: { email: string; username: string; university: string; department: string; password: string }) {
  store.user = { ...store.user, email: payload.email, username: payload.username, university: payload.university, department: payload.department };
  return delay({ token: "", user: store.user });
}

export async function login(payload: { email: string; password: string }) {
  return delay({ token: "", user: store.user });
}

export async function getMe() {
  return delay({ user: store.user });
}

export async function saveProfile(payload: { university: string; department: string; interests: Array<{ topic: string; level: "beginner" | "intermediate" | "advanced" }>; availability: Array<{ day: string; startHour: number; endHour: number }> }) {
  store.user = { ...store.user, university: payload.university, department: payload.department, interests: payload.interests, availability: payload.availability };
  return delay({ user: store.user });
}

export async function getMatches() {
  return delay({ matches: store.matches });
}

export async function getGroups() {
  return delay({ groups: store.groups });
}

export async function createGroup(payload: { name: string; topic: string; description: string; invitedUserIds?: string[] }) {
  const id = `g${Date.now()}`;
  const group: Group = { id, name: payload.name, topic: payload.topic, description: payload.description, memberIds: [store.user.id, ...(payload.invitedUserIds || [])] };
  store.groups.push(group);
  return delay({ group });
}

export async function joinGroup(groupId: string) {
  const group = store.groups.find((g) => g.id === groupId);
  if (group && !group.memberIds.includes(store.user.id)) group.memberIds.push(store.user.id);
  return delay({ ok: true });
}

export async function startSession(groupId?: string) {
  const session = { id: `s${Date.now()}`, groupId: groupId || null };
  return delay({ session });
}

export async function endSession(sessionId: string) {
  // increment some demo stats
  store.stats.totalStudyMinutes += 25;
  store.stats.totalXp += 10;
  store.user.totalStudyMinutes = store.stats.totalStudyMinutes;
  store.user.totalXp = store.stats.totalXp;
  return delay({ totals: store.stats });
}

export async function getStats() {
  return delay(store.stats);
}

export async function listNotes() {
  return delay({ notes: store.notes });
}

export async function createNote(payload: { title: string; content: string; links: string[] }) {
  const note = { id: `n${Date.now()}`, userId: store.user.id, title: payload.title, content: payload.content, links: payload.links, updatedAt: new Date().toISOString() };
  store.notes.push(note);
  return delay({ note });
}

export async function listGlobalMessages() {
  return delay({ messages: store.messages.global });
}

export async function listGroupMessages(groupId: string) {
  return delay({ messages: store.messages.groups[groupId] || [] });
}

export default {};
