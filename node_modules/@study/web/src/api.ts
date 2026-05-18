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
type BackendGroup = {
  id: string;
  name: string;
  topic: string;
  description: string;
  memberIds?: string[];
  members?: Array<{ userId: string }>;
};
type NoteContent = { type: "text" | "image" | "link"; id: string; content: string; metadata?: string };
type Note = { id: string; userId: string; ownerUsername: string; title: string; content: NoteContent[]; isPrivate: boolean; canEdit?: boolean; isFriendShared?: boolean; accessRequestCount?: number; updatedAt?: string };
type AccessRequest = { id: string; noteId: string; requesterId: string; requesterUsername: string; status: "pending" | "approved" | "rejected"; createdAt: string };
type FriendRequest = { id: string; requesterId: string; requesterUsername: string; addresseeId: string; addresseeUsername: string; status: "pending" | "accepted" | "rejected"; createdAt: string; isIncoming?: boolean; isOutgoing?: boolean };
type Message = { id: string; userId?: string; username: string; groupId: string | null; content: string; createdAt: string };

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
  accessRequests: [] as AccessRequest[],
  friendRequests: [] as FriendRequest[],
  stats: { totalXp: demoUser.totalXp, totalStudyMinutes: demoUser.totalStudyMinutes },
  messages: { global: [] as Message[], groups: {} as Record<string, Message[]> }
};

function normalizeGroup(group: BackendGroup): Group {
  return {
    id: group.id,
    name: group.name,
    topic: group.topic,
    description: group.description,
    memberIds: group.memberIds ?? group.members?.map((member) => member.userId) ?? []
  };
}

function delay<T>(value: T, ms = 200) {
  return new Promise<T>((res) => setTimeout(() => res(value), ms));
}

const API_BASE = (import.meta as any).env?.VITE_API_URL || "http://localhost:4000";

async function request(path: string, opts?: RequestInit) {
  try {
    const res = await fetch(API_BASE + path, opts);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.warn("API request failed, falling back to mock:", e);
    return null;
  }
}

export async function register(payload: { email: string; username: string; university: string; department: string; password: string }) {
  const res = await request("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (res?.user) {
    store.user = res.user;
    return res;
  }
  store.user = { ...store.user, email: payload.email, username: payload.username, university: payload.university, department: payload.department };
  return delay({ token: "", user: store.user });
}

export async function login(payload: { email: string; password: string }) {
  const res = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (res?.user) return res;
  return delay({ token: "", user: store.user });
}

export async function getMe() {
  const res = await request("/api/auth/me");
  if (res?.user) return res;
  return delay({ user: store.user });
}

export async function saveProfile(payload: { university: string; department: string; interests: Array<{ topic: string; level: "beginner" | "intermediate" | "advanced" }>; availability: Array<{ day: string; startHour: number; endHour: number }> }) {
  const res = await request("/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (res?.user) return res;
  store.user = { ...store.user, university: payload.university, department: payload.department, interests: payload.interests, availability: payload.availability };
  return delay({ user: store.user });
}

export async function getMatches() {
  const res = await request("/api/matches/users");
  if (res?.matches) return res;
  return delay({ matches: store.matches });
}

export async function getGroups() {
  const res = await request("/api/groups");
  if (res?.groups) {
    return { groups: res.groups.map(normalizeGroup) };
  }
  return delay({ groups: store.groups });
}

export async function createGroup(payload: { name: string; topic: string; description: string; invitedUserIds?: string[] }) {
  const res = await request("/api/groups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (res?.group) {
    return { group: normalizeGroup(res.group) };
  }
  const id = `g${Date.now()}`;
  const group: Group = { id, name: payload.name, topic: payload.topic, description: payload.description, memberIds: [store.user.id, ...(payload.invitedUserIds || [])] };
  store.groups.push(group);
  return delay({ group });
}

export async function joinGroup(groupId: string) {
  const res = await request(`/api/groups/${groupId}/join`, { method: "POST" });
  if (res) return res;
  const group = store.groups.find((g) => g.id === groupId);
  if (group && !group.memberIds.includes(store.user.id)) group.memberIds.push(store.user.id);
  return delay({ ok: true });
}

export async function startSession(groupId?: string) {
  const res = await request("/api/study-sessions/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ groupId })
  });
  if (res?.session) return res;
  const session = { id: `s${Date.now()}`, groupId: groupId || null };
  return delay({ session });
}

export async function endSession(sessionId: string) {
  const res = await request(`/api/study-sessions/${sessionId}/end`, { method: "POST" });
  if (res?.totals) return res;
  store.stats.totalStudyMinutes += 25;
  store.stats.totalXp += 10;
  store.user.totalStudyMinutes = store.stats.totalStudyMinutes;
  store.user.totalXp = store.stats.totalXp;
  return delay({ totals: store.stats });
}

export async function getStats() {
  const res = await request("/api/stats/me");
  if (res) return res;
  return delay(store.stats);
}

export async function listNotes() {
  const res = await request("/api/notes");
  if (res?.notes) return res;
  return delay({ notes: store.notes });
}

export async function listFriendRequests() {
  const res = await request("/api/friends/requests");
  if (res?.requests) return res;
  return delay({ requests: store.friendRequests });
}

export async function listFriends() {
  const res = await request("/api/friends");
  if (res?.friends) return res;
  return delay({ friends: [] });
}

export async function sendFriendRequest(targetUserId: string) {
  const res = await request("/api/friends/requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetUserId })
  });
  if (res?.request) return res;
  const requestRecord: FriendRequest = {
    id: `fr${Date.now()}`,
    requesterId: store.user.id,
    requesterUsername: store.user.username,
    addresseeId: targetUserId,
    addresseeUsername: targetUserId,
    status: "pending",
    createdAt: new Date().toISOString(),
    isOutgoing: true
  };
  store.friendRequests = [...store.friendRequests, requestRecord];
  return delay({ request: requestRecord });
}

export async function acceptFriendRequest(requestId: string) {
  const res = await request(`/api/friends/requests/${requestId}/accept`, { method: "POST" });
  if (res?.request) return res;
  const requestRecord = store.friendRequests.find((entry) => entry.id === requestId);
  if (requestRecord) {
    requestRecord.status = "accepted";
  }
  return delay({ request: requestRecord });
}

export async function rejectFriendRequest(requestId: string) {
  const res = await request(`/api/friends/requests/${requestId}/reject`, { method: "POST" });
  if (res?.request) return res;
  const requestRecord = store.friendRequests.find((entry) => entry.id === requestId);
  if (requestRecord) {
    requestRecord.status = "rejected";
  }
  return delay({ request: requestRecord });
}

export async function createNote(payload: { title: string; content: NoteContent[]; isPrivate?: boolean }) {
  const res = await request("/api/notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (res?.note) return res;
  const note = { id: `n${Date.now()}`, userId: store.user.id, ownerUsername: store.user.username, title: payload.title, content: payload.content || [], updatedAt: new Date().toISOString(), isPrivate: payload.isPrivate ?? false, canEdit: true, accessRequestCount: 0 };
  store.notes.push(note);
  return delay({ note });
}

export async function updateNotePrivacy(noteId: string, isPrivate: boolean) {
  const res = await request(`/api/notes/${noteId}/privacy`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isPrivate }) });
  if (res?.note) return res;
  const note = store.notes.find((n) => n.id === noteId && n.userId === store.user.id);
  if (note) {
    note.isPrivate = isPrivate;
  }
  return delay({ note });
}

export async function requestAccessToNote(noteId: string) {
  const res = await request(`/api/notes/${noteId}/request-access`, { method: "POST" });
  if (res?.request) return res;
  const note = store.notes.find((n) => n.id === noteId);
  if (note && note.isPrivate && note.userId !== store.user.id) {
    const existingRequest = store.accessRequests.find((r) => r.noteId === noteId && r.requesterId === store.user.id);
    if (!existingRequest) {
      const request: AccessRequest = { id: `ar${Date.now()}`, noteId, requesterId: store.user.id, requesterUsername: store.user.username, status: "pending", createdAt: new Date().toISOString() };
      store.accessRequests.push(request);
      return delay({ request });
    }
  }
  return delay({ ok: false });
}

export async function getAccessRequests(noteId: string) {
  const res = await request(`/api/notes/${noteId}/access-requests`);
  if (res?.requests) return res;
  const requests = store.accessRequests.filter((r) => r.noteId === noteId);
  return delay({ requests });
}

export async function approveAccessRequest(requestId: string) {
  const res = await request(`/api/notes/access-requests/${requestId}/approve`, { method: "POST" });
  if (res) return res;
  const accessRequest = store.accessRequests.find((r) => r.id === requestId);
  if (accessRequest) {
    accessRequest.status = "approved";
  }
  return delay({ ok: true });
}

export async function rejectAccessRequest(requestId: string) {
  const res = await request(`/api/notes/access-requests/${requestId}/reject`, { method: "POST" });
  if (res) return res;
  const accessRequest = store.accessRequests.find((r) => r.id === requestId);
  if (accessRequest) {
    accessRequest.status = "rejected";
  }
  return delay({ ok: true });
}

export async function listGlobalMessages() {
  const res = await request("/api/chat/global");
  if (res?.messages) return res;
  return delay({ messages: store.messages.global });
}

export async function sendGlobalMessage(content: string) {
  const res = await request("/api/chat/global", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content })
  });
  if (res?.message) return res;
  const message: Message = {
    id: String(Date.now()),
    userId: store.user.id,
    username: store.user.username,
    groupId: null,
    content,
    createdAt: new Date().toISOString()
  };
  store.messages.global.push(message);
  return delay({ message });
}

export async function listGroupMessages(groupId: string) {
  const res = await request(`/api/chat/groups/${groupId}`);
  if (res?.messages) return res;
  return delay({ messages: store.messages.groups[groupId] || [] });
}

export async function sendGroupMessage(groupId: string, content: string) {
  const res = await request(`/api/chat/groups/${groupId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content })
  });
  if (res?.message) return res;
  const message: Message = {
    id: String(Date.now()),
    userId: store.user.id,
    username: store.user.username,
    groupId,
    content,
    createdAt: new Date().toISOString()
  };
  store.messages.groups[groupId] = [...(store.messages.groups[groupId] || []), message];
  return delay({ message });
}

export default {};
