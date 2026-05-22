
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

type Group = {
  id: string;
  name: string;
  topic: string;
  description: string;
  memberIds: string[];
  creatorId?: string;
  creatorUsername?: string;
};

type BackendGroup = {
  id: string;
  name: string;
  topic: string;
  description: string;
  memberIds?: string[];
  members?: Array<{ userId: string }>;
  creatorId?: string;
  creator?: { id?: string; username?: string };
};

type GroupInvite = {
  id: string;
  groupId: string;
  groupName: string;
  groupTopic: string;
  inviterId: string;
  inviterUsername: string;
  inviteeId: string;
  inviteeUsername: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
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

type MockUserRecord = User & { password: string };
const MOCK_USERS_STORAGE_KEY = "studygroupfinder.mockUsers";
const AUTH_STORAGE_KEY = "studygroupfinder.session";
const STORE_STORAGE_KEY_PREFIX = "studygroupfinder.store";
const GROUP_INVITES_STORAGE_KEY = "studygroupfinder.groupInvites";
const GLOBAL_REMOVED_GROUPS_KEY = "studygroupfinder.removedGroupIds.global";

function loadGlobalRemovedGroupIds(): string[] {
  try {
    const raw = window.localStorage.getItem(GLOBAL_REMOVED_GROUPS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v) => typeof v === "string");
  } catch {
    return [];
  }
}

function saveGlobalRemovedGroupId(id: string) {
  try {
    const current = loadGlobalRemovedGroupIds();
    if (!current.includes(id)) {
      current.push(id);
      window.localStorage.setItem(GLOBAL_REMOVED_GROUPS_KEY, JSON.stringify(current));
    }
  } catch {
    // ignore
  }
}

function loadMockUsers(): MockUserRecord[] {
  try {
    const raw = window.localStorage.getItem(MOCK_USERS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((entry): entry is MockUserRecord => {
      return (
        Boolean(entry) &&
        typeof entry === "object" &&
        typeof (entry as MockUserRecord).id === "string" &&
        typeof (entry as MockUserRecord).email === "string" &&
        typeof (entry as MockUserRecord).password === "string"
      );
    });
  } catch {
    return [];
  }
}

function saveMockUsers(users: MockUserRecord[]) {
  try {
    window.localStorage.setItem(MOCK_USERS_STORAGE_KEY, JSON.stringify(users));
  } catch {
    void users;
  }
}

function awardXp(xp: number) {
  if (xp <= 0) {
    return;
  }

  store.stats.totalXp += xp;
  store.user.totalXp = store.stats.totalXp;
}

function loadGroupInvites(): GroupInvite[] {
  try {
    const raw = window.localStorage.getItem(GROUP_INVITES_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((entry): entry is GroupInvite => {
      return (
        Boolean(entry) &&
        typeof entry === "object" &&
        typeof (entry as GroupInvite).id === "string" &&
        typeof (entry as GroupInvite).groupId === "string" &&
        typeof (entry as GroupInvite).inviteeId === "string" &&
        typeof (entry as GroupInvite).status === "string"
      );
    });
  } catch {
    return [];
  }
}

function saveGroupInvites(invites: GroupInvite[]) {
  try {
    window.localStorage.setItem(GROUP_INVITES_STORAGE_KEY, JSON.stringify(invites));
  } catch {
    void invites;
  }
}

function upsertGroupInvites(nextInvites: GroupInvite[]) {
  const current = loadGroupInvites();
  const updated = [...current];

  for (const invite of nextInvites) {
    const index = updated.findIndex((entry) => entry.id === invite.id);
    if (index >= 0) {
      updated[index] = invite;
    } else {
      updated.push(invite);
    }
  }

  saveGroupInvites(updated);
}

function getCurrentInviteeId() {
  return getStoredSessionUserId() || store.user.id;
}

function buildGroupInvites(group: Group, invitedUsers: Array<{ id: string; username: string }>): GroupInvite[] {
  const uniqueInvites = invitedUsers.filter((invitee) => invitee.id && invitee.id !== store.user.id);

  return uniqueInvites.map((invitee) => ({
    id: `gi-${group.id}-${invitee.id}`,
    groupId: group.id,
    groupName: group.name,
    groupTopic: group.topic,
    inviterId: store.user.id,
    inviterUsername: store.user.username,
    inviteeId: invitee.id,
    inviteeUsername: invitee.username,
    status: "pending",
    createdAt: new Date().toISOString()
  }));
}

function updateGroupInviteStatus(inviteId: string, status: GroupInvite["status"]) {
  const invites = loadGroupInvites();
  const invite = invites.find((entry) => entry.id === inviteId);

  if (!invite) {
    return null;
  }

  invite.status = status;
  saveGroupInvites(invites);
  return invite;
}

function loadUserFromSessionStorage(): User | null {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && "user" in parsed) {
      const session = parsed as { user?: User };
      return session.user ?? null;
    }

    return parsed as User;
  } catch {
    return null;
  }
}

const store = {
  user: { ...demoUser },
  matches: [
    { userId: "u1", username: "Alice", interests: [{ topic: "math", level: "intermediate" }] },
    { userId: "u2", username: "Bob", interests: [{ topic: "physics", level: "beginner" }] },
    { userId: "u3", username: "Charlie", interests: [{ topic: "math", level: "advanced" }] }
  ],
  groups: [
    {
      id: "g1",
      name: "Algebra Team",
      topic: "math",
      description: "Evening practice",
      memberIds: ["user-demo"],
      creatorId: "user-demo",
      creatorUsername: "Demo Student"
    }
  ] as Group[],
  notes: [
    {
      id: "n-public-1",
      userId: "u2",
      ownerUsername: "Alice",
      title: "Public Calculus Tips",
      content: [
        {
          id: "block-1",
          type: "text",
          content: "A short public checklist for staying on track in calculus review.",
          metadata: "Public note"
        }
      ],
      isPrivate: false,
      canEdit: false,
      updatedAt: new Date().toISOString()
    }
  ] as Note[],
  accessRequests: [] as AccessRequest[],
  friendRequests: [] as FriendRequest[],
  stats: { totalXp: demoUser.totalXp, totalStudyMinutes: demoUser.totalStudyMinutes },
  messages: { global: [] as Message[], groups: {} as Record<string, Message[]> },
  activeSessions: {} as Record<string, { id: string; groupId?: string | null; startedAt: string; startedBy: string }> ,
  removedGroupIds: [] as string[]
};

function normalizeGroup(group: BackendGroup): Group {
  return {
    id: group.id,
    name: group.name,
    topic: group.topic,
    description: group.description,
    memberIds: group.memberIds ?? group.members?.map((member) => member.userId) ?? [],
    creatorId: group.creatorId ?? group.creator?.id,
    creatorUsername: group.creator?.username
  };
}

function delay<T>(value: T, ms = 200) {
  return new Promise<T>((res) => setTimeout(() => res(value), ms));
}

function getStoredSessionUserId() {
  const sessionUser = loadUserFromSessionStorage();
  return sessionUser?.id || null;
}

function getStoreStorageKey() {
  const sessionUserId = getStoredSessionUserId();
  return sessionUserId ? `${STORE_STORAGE_KEY_PREFIX}:${sessionUserId}` : `${STORE_STORAGE_KEY_PREFIX}:anonymous`;
}

function loadStoreState() {
  try {
    const raw = window.localStorage.getItem(getStoreStorageKey());
    if (!raw) return;
    const parsed = JSON.parse(raw) as any;
    if (!parsed) return;

    if (Array.isArray(parsed.friendRequests)) store.friendRequests = parsed.friendRequests;
    if (Array.isArray(parsed.notes)) store.notes = parsed.notes;
    if (Array.isArray(parsed.groups)) store.groups = parsed.groups;
    if (Array.isArray(parsed.removedGroupIds)) store.removedGroupIds = parsed.removedGroupIds;
    if (parsed.stats && typeof parsed.stats === "object") store.stats = parsed.stats;
    if (parsed.messages && typeof parsed.messages === "object") store.messages = parsed.messages;
    if (parsed.activeSessions && typeof parsed.activeSessions === "object") store.activeSessions = parsed.activeSessions;
  } catch {
    // ignore
  }
}

function saveStoreState() {
  try {
    const payload = {
      friendRequests: store.friendRequests,
      notes: store.notes,
      groups: store.groups,
      removedGroupIds: store.removedGroupIds,
      stats: store.stats,
      messages: store.messages
      , activeSessions: store.activeSessions
    };
    window.localStorage.setItem(getStoreStorageKey(), JSON.stringify(payload));
  } catch {
    // ignore
  }
}

// hydrate persisted store on load
loadStoreState();

const API_BASE = (import.meta as any).env?.VITE_API_URL || "http://localhost:4000";

async function request(path: string, opts?: RequestInit) {
  try {
    loadStoreState();
    const headers = new Headers(opts?.headers || {});
    const sessionUserId = getStoredSessionUserId();

    if (sessionUserId) {
      headers.set("x-user-id", sessionUserId);
    }

    const res = await fetch(API_BASE + path, {
      ...opts,
      headers
    });
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
    store.stats = {
      totalXp: res.user.totalXp ?? 0,
      totalStudyMinutes: res.user.totalStudyMinutes ?? 0
    };
    return res;
  }

  const users = loadMockUsers();
  const alreadyExists = users.some((entry) => entry.email.toLowerCase() === payload.email.toLowerCase());
  if (alreadyExists) {
    throw new Error("An account with this email already exists.");
  }

  const mockUser: User = {
    id: `user-${Date.now()}`,
    email: payload.email,
    username: payload.username,
    university: payload.university,
    department: payload.department,
    totalXp: 0,
    totalStudyMinutes: 0,
    interests: [],
    availability: []
  };

  users.push({ ...mockUser, password: payload.password });
  saveMockUsers(users);
  store.user = mockUser;
  store.stats = { totalXp: 0, totalStudyMinutes: 0 };
  saveStoreState();
  return delay({ token: "", user: store.user });
}

export async function login(payload: { email: string; password: string }) {
  const res = await request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (res?.user) {
    store.user = res.user;
    store.stats = {
      totalXp: res.user.totalXp ?? 0,
      totalStudyMinutes: res.user.totalStudyMinutes ?? 0
    };
    return res;
  }

  const users = loadMockUsers();
  const match = users.find(
    (entry) => entry.email.toLowerCase() === payload.email.toLowerCase() && entry.password === payload.password
  );

  if (!match) {
    throw new Error("Invalid email or password.");
  }

  const { password: _password, ...user } = match;
  void _password;
  store.user = user;
  store.stats = {
    totalXp: user.totalXp,
    totalStudyMinutes: user.totalStudyMinutes
  };
  saveStoreState();

  return delay({ token: "", user: store.user });
} 
export async function getMe() {
  const res = await request("/api/auth/me");
  if (res?.user) return res;
  const storedSessionUser = loadUserFromSessionStorage();
  if (storedSessionUser) {
    store.user = storedSessionUser;
    store.stats = {
      totalXp: storedSessionUser.totalXp,
      totalStudyMinutes: storedSessionUser.totalStudyMinutes
    };
    return delay({ user: storedSessionUser });
  }
  // When the backend is unreachable and there is no stored session,
  // return null so callers don't silently fall back to the demo user.
  return null;
}

export async function saveProfile(payload: { university: string; department: string; interests: Array<{ topic: string; level: "beginner" | "intermediate" | "advanced" }>; availability: Array<{ day: string; startHour: number; endHour: number }> }) {
  const res = await request("/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (res?.user) return res;
  store.user = { ...store.user, university: payload.university, department: payload.department, interests: payload.interests, availability: payload.availability };
  saveStoreState();
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
    const normalized = res.groups.map(normalizeGroup);
    // filter out any groups the user has previously deleted locally when the
    // backend record is owned by the server (so backend 404s don't reintroduce)
    const globalRemoved = loadGlobalRemovedGroupIds();
    const filtered = normalized.filter((group: Group) => !store.removedGroupIds.includes(group.id) && !globalRemoved.includes(group.id));
    return { groups: filtered };
  }
  // return local store groups, but filter removed ids as well (including global)
  const globalRemoved = loadGlobalRemovedGroupIds();
  return delay({ groups: store.groups.filter((g) => !store.removedGroupIds.includes(g.id) && !globalRemoved.includes(g.id)) });
}

export async function deleteGroup(groupId: string) {
  const res = await request(`/api/groups/${groupId}`, { method: "DELETE" });
  if (res) return res;
  const groupIndex = store.groups.findIndex((g) => g.id === groupId);

  // If the group isn't present in the mock store, assume the backend owns it
  // and treat as a successful delete (avoids restoring the UI when backend
  // returned 404 but frontend list came from the backend).
  if (groupIndex === -1) {
    // record the deletion locally so a later refresh doesn't reintroduce the group
    if (!store.removedGroupIds.includes(groupId)) {
      store.removedGroupIds.push(groupId);
      saveStoreState();
    }
    // also persist as a global deletion so it disappears for other local users
    try {
      saveGlobalRemovedGroupId(groupId);
    } catch {}
    return delay({ ok: true, note: "not_in_mock" });
  }

  const group = store.groups[groupIndex];
  // only creator can delete a group in the mock
  const creatorId = (group as any).creatorId ?? (group as any).creator?.id ?? undefined;
  if (creatorId && creatorId !== store.user.id) {
    return delay({ ok: false, error: "forbidden" });
  }

  store.groups.splice(groupIndex, 1);
  saveStoreState();
  try {
    // mark globally removed so other local accounts won't see it either
    saveGlobalRemovedGroupId(groupId);
  } catch {}
  return delay({ ok: true });
}

export async function createGroup(payload: { name: string; topic: string; description: string; invitedUserIds?: string[]; invitedUsers?: Array<{ id: string; username: string }> }) {
  const res = await request("/api/groups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const invitedUsers = payload.invitedUsers ?? (payload.invitedUserIds || []).map((userId) => ({ id: userId, username: userId }));
  if (res?.group) {
    if (invitedUsers.length > 0) {
      upsertGroupInvites(buildGroupInvites(normalizeGroup(res.group), invitedUsers));
    }
    return { group: normalizeGroup(res.group) };
  }
  const id = `g${Date.now()}`;
  const group: Group = {
    id,
    name: payload.name,
    topic: payload.topic,
    description: payload.description,
    memberIds: [store.user.id],
    creatorId: store.user.id,
    creatorUsername: store.user.username
  };
  store.groups.push(group);
  if (invitedUsers.length > 0) {
    upsertGroupInvites(buildGroupInvites(group, invitedUsers));
  }
  saveStoreState();
  return delay({ group });
}

export async function listGroupInvites() {
  const currentUserId = getCurrentInviteeId();
  return delay({ invites: loadGroupInvites().filter((invite) => invite.inviteeId === currentUserId) });
}

export async function acceptGroupInvite(inviteId: string) {
  const invite = updateGroupInviteStatus(inviteId, "accepted");
  if (!invite) {
    return delay({ invite: null });
  }

  return delay({ invite });
}

export async function rejectGroupInvite(inviteId: string) {
  const invite = updateGroupInviteStatus(inviteId, "rejected");
  if (!invite) {
    return delay({ invite: null });
  }

  return delay({ invite });
}

export async function joinGroup(groupId: string) {
  const res = await request(`/api/groups/${groupId}/join`, { method: "POST" });
  if (res) return res;
  const group = store.groups.find((g) => g.id === groupId);
  if (group && !group.memberIds.includes(store.user.id)) group.memberIds.push(store.user.id);
  saveStoreState();
  return delay({ ok: true });
}

export async function startSession(groupId?: string) {
  const res = await request("/api/study-sessions/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ groupId })
  });
  if (res?.session) return res;

  const id = `s${Date.now()}`;
  const session = { id, groupId: groupId || null, startedAt: new Date().toISOString(), startedBy: store.user.id };
  store.activeSessions[session.id] = session;
  saveStoreState();
  return delay({ session });
}

export async function endSession(sessionId: string) {
  const res = await request(`/api/study-sessions/${sessionId}/end`, { method: "POST" });
  if (res?.totals) return res;
  const session = store.activeSessions[sessionId];
  if (!session) {
    // fallback: add a small fixed amount
    store.stats.totalStudyMinutes += 25;
    const xp = 10;
    store.stats.totalXp += xp;
    store.user.totalStudyMinutes = store.stats.totalStudyMinutes;
    store.user.totalXp = store.stats.totalXp;
    saveStoreState();
    return delay({ totals: store.stats, minutes: 25, xp });
  }

  const started = Date.parse(session.startedAt);
  const now = Date.now();
  const minutes = Math.max(1, Math.round((now - started) / 60000));

  // award XP: 5 XP per 10 minutes studied (rounded down), minimum 2 XP
  const xp = Math.max(2, Math.floor(minutes / 10) * 5);

  store.stats.totalStudyMinutes += minutes;
  store.stats.totalXp += xp;
  store.user.totalStudyMinutes = store.stats.totalStudyMinutes;
  store.user.totalXp = store.stats.totalXp;

  // remove active session
  delete store.activeSessions[sessionId];
  saveStoreState();

  return delay({ totals: store.stats, minutes, xp });
}

export async function getStats() {
  const res = await request("/api/stats/me");
  if (res) return res;
  return delay(store.stats);
}

export async function listNotes(scope?: "mine" | "public") {
  const query = scope === "public" ? "?scope=public" : "";
  const res = await request(`/api/notes${query}`);
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
  saveStoreState();
  return delay({ request: requestRecord });
}

export async function acceptFriendRequest(requestId: string) {
  const res = await request(`/api/friends/requests/${requestId}/accept`, { method: "POST" });
  if (res?.request) return res;
  const requestRecord = store.friendRequests.find((entry) => entry.id === requestId);
  if (requestRecord) {
    requestRecord.status = "accepted";
    saveStoreState();
  }
  return delay({ request: requestRecord });
}

export async function rejectFriendRequest(requestId: string) {
  const res = await request(`/api/friends/requests/${requestId}/reject`, { method: "POST" });
  if (res?.request) return res;
  const requestRecord = store.friendRequests.find((entry) => entry.id === requestId);
  if (requestRecord) {
    requestRecord.status = "rejected";
    saveStoreState();
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

  // award XP for sharing public notes
  if (!note.isPrivate) {
    awardXp(20);
  }

  saveStoreState();
  return delay({ note });
}

export async function updateNotePrivacy(noteId: string, isPrivate: boolean) {
  const res = await request(`/api/notes/${noteId}/privacy`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isPrivate }) });
  if (res?.note) return res;
  const note = store.notes.find((n) => n.id === noteId && n.userId === store.user.id);
  if (note) {
    const wasPrivate = note.isPrivate;
    note.isPrivate = isPrivate;
    if (wasPrivate && !isPrivate) {
      awardXp(20);
    }
    saveStoreState();
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
      saveStoreState();
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
    saveStoreState();
  }
  return delay({ ok: true });
}

export async function rejectAccessRequest(requestId: string) {
  const res = await request(`/api/notes/access-requests/${requestId}/reject`, { method: "POST" });
  if (res) return res;
  const accessRequest = store.accessRequests.find((r) => r.id === requestId);
  if (accessRequest) {
    accessRequest.status = "rejected";
    saveStoreState();
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

  awardXp(content.length > 80 ? 2 : 1);

  saveStoreState();
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

  // award XP for active participation in group chat
  try {
    const xpForMessage = content.length > 80 ? 2 : 1;
    store.stats.totalXp += xpForMessage;
    store.user.totalXp = store.stats.totalXp;
  } catch {
    // ignore
  }

  saveStoreState();
  return delay({ message });
}

export default {};
