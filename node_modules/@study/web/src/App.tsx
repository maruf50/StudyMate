import { useEffect, useState } from "react";
import {
  createGroup,
  getGroups,
  getMatches,
  getMe,
  login,
  register,
  getStats,
  joinGroup,
  saveProfile,
  createNote,
  updateNotePrivacy,
  approveAccessRequest,
  rejectAccessRequest,
  listNotes,
  getAccessRequests,
  listFriendRequests,
  listFriends,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  listGlobalMessages,
  listGroupMessages,
  sendGlobalMessage,
  sendGroupMessage
} from "./api";
import type { User } from "./api";
import { AuthScreen, type AuthMode } from "./components/AuthScreen";
import { MainNav } from "./components/MainNav";
import { DashboardView } from "./components/views/DashboardView";
import { GroupsView } from "./components/views/GroupsView";
import { NotesView } from "./components/views/NotesView";
import { FriendsView } from "./components/views/FriendsView";
import { ChatView } from "./components/views/ChatView";
import { MatchingView } from "./components/views/MatchingView";
import { TrackerView } from "./components/views/TrackerView";
import { NAV_ITEMS, STUDY_HOURS_GOAL, XP_GOAL } from "./constants";
import type { View, NoteContent } from "./types";
import { buildInterestChart, filterMatchesByInterest, uniqueInterestTopics } from "./utils";
import type { GroupSummary } from "./types";
import type { NoteSummary } from "./types";
import type { Message } from "./types";
import type { MatchCandidate } from "./types";
import type { FriendRequestSummary } from "./types";

type ApiGroup = {
  id: string;
  name: string;
  topic: string;
  description: string;
  memberIds?: string[];
  members?: Array<{ userId: string }>;
};

const AUTH_STORAGE_KEY = "studygroupfinder.session";

const VIEW_PATHS: Record<View, string> = {
  dashboard: "/dashboard",
  matching: "/matching",
  groups: "/groups",
  notes: "/notes",
  friends: "/friends",
  chat: "/chat",
  tracker: "/tracker"
};

const VIEW_META: Record<View, { title: string; subtitle: string }> = {
  dashboard: { title: "Dashboard", subtitle: "Your study profile, progress, and setup" },
  matching: { title: "Matching", subtitle: "Find best-fit teammates and create a study session" },
  groups: { title: "Groups", subtitle: "Create, join, and manage study groups" },
  notes: { title: "Notes", subtitle: "Your saved notes and study reminders" },
  friends: { title: "Friends", subtitle: "Manage your friends and friend requests" },
  chat: { title: "Chat", subtitle: "Talk with everyone or your study group" },
  tracker: { title: "Tracker", subtitle: "Monitor your study sessions and progress" }
};

function loadStoredUser(): User | null {
  try {
    const storedValue = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!storedValue) {
      return null;
    }

    const parsed = JSON.parse(storedValue) as unknown;

    if (parsed && typeof parsed === "object" && "user" in parsed) {
      const session = parsed as { user?: User };
      return session.user ?? null;
    }

    return parsed as User;
  } catch {
    return null;
  }
}

function storeUserSession(user: User | null) {
  try {
    if (user) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user }));
      return;
    }

    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    void user;
  }
}

function getViewFromPath(pathname: string): View {
  const segment = pathname.split("/").filter(Boolean)[0];

  if (
    segment === "dashboard" ||
    segment === "matching" ||
    segment === "groups" ||
    segment === "notes" ||
    segment === "friends" ||
    segment === "chat" ||
    segment === "tracker"
  ) {
    return segment;
  }

  return "dashboard";
}

function mapGroupsToSummaries(groups: ApiGroup[], user: User | null, selectedGroupId: string, activeSessionId: string): GroupSummary[] {
  return groups.map((group) => {
    const memberIds = group.memberIds ?? group.members?.map((member) => member.userId) ?? [];
    const memberCount = memberIds.length;
    const isMember = Boolean(user && memberIds.includes(user.id));
    const hasCapacity = memberCount < 6;
    const isActive = group.id === selectedGroupId && Boolean(activeSessionId);

    return {
      id: group.id,
      name: group.name,
      memberCount,
      maxMembers: 6,
      studyTopic: group.topic,
      studyDescription: group.description,
      leaderName: user?.username || "Study Lead",
      totalStudyMinutes: memberCount * 45,
      isActive,
      activeSessionCount: isActive ? 1 : 0,
      hasCapacity,
      isMember,
      canJoin: hasCapacity && !isMember
    };
  });
}

function App() {
  return <AppShell />;
}

function AppShell() {
  const [user, setUser] = useState<User | null>(() => loadStoredUser());
  const [authMode, setAuthMode] = useState<AuthMode>(() =>
    window.location.pathname === "/signup" ? "signup" : "login"
  );
  const [authError, setAuthError] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [activeView, setActiveView] = useState<View>(() => getViewFromPath(window.location.pathname));
  const [notes, setNotes] = useState<NoteSummary[]>([
    { id: "1", userId: "user-demo", ownerUsername: "Demo Student", title: "Study group ideas", isPrivate: false, canEdit: true, content: [] },
    { id: "2", userId: "user-demo", ownerUsername: "Demo Student", title: "Exam prep checklist", isPrivate: true, canEdit: true, content: [] }
  ]);
  const [accessRequests, setAccessRequests] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequestSummary[]>([]);
  const [friends, setFriends] = useState<Array<{ id: string; username: string; userId: string }>>([]);
  const [globalMessages, setGlobalMessages] = useState<Message[]>([
    {
      id: "m1",
      username: "StudyBot",
      content: "Welcome to global chat.",
      groupId: null,
      createdAt: new Date().toISOString()
    }
  ]);
  const [groupMessages, setGroupMessages] = useState<Message[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [activeSessionId, setActiveSessionId] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [groupChatInput, setGroupChatInput] = useState("");
  const [matchInterest, setMatchInterest] = useState("");
  const [partyGroupName, setPartyGroupName] = useState("Focus Session");
  const [selectedMatchUserIds, setSelectedMatchUserIds] = useState<string[]>([]);
  const [allMatches, setAllMatches] = useState<MatchCandidate[]>([]);
  const [demoCandidates, setDemoCandidates] = useState<MatchCandidate[]>([]);
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [demoStatus, setDemoStatus] = useState("Pick users and create a study session group.");
  const [trackerSessionId, setTrackerSessionId] = useState("");
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [groupName, setGroupName] = useState("Study Group");
  const [groupTopic, setGroupTopic] = useState("math");
  const [groupDescription, setGroupDescription] = useState("Focused evening study session");

  const [interestInput, setInterestInput] = useState("math");
  const [universityInput, setUniversityInput] = useState("");
  const [departmentInput, setDepartmentInput] = useState("");

  useEffect(() => {
    const handlePopState = () => {
      setActiveView(getViewFromPath(window.location.pathname));
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    if (window.location.pathname !== VIEW_PATHS[activeView]) {
      window.history.replaceState({}, "", VIEW_PATHS[activeView]);
    }
  }, [activeView]);

  useEffect(() => {
    if (!user) {
      return;
    }

    void refreshCoreData();
  }, [user]);

  useEffect(() => {
    const nextPath = user
      ? VIEW_PATHS[activeView]
      : authMode === "signup"
        ? "/signup"
        : "/login";

    if (window.location.pathname !== nextPath) {
      window.history.replaceState({}, "", nextPath);
    }
  }, [activeView, authMode, user]);

  useEffect(() => {
    if (activeView !== "notes") return;

    let cancelled = false;

    async function loadNotes() {
      const [notesRes, friendRequestsRes] = await Promise.all([listNotes(), listFriendRequests()]);

      if (!cancelled && notesRes?.notes) {
        setNotes(notesRes.notes);

        const reqs: any[] = [];
        for (const note of notesRes.notes) {
          if (note.canEdit === false) {
            continue;
          }

          const response = await getAccessRequests(note.id);
          if (response?.requests) {
            reqs.push(...response.requests);
          }
        }

        setAccessRequests(reqs);
      }

      if (!cancelled && friendRequestsRes?.requests) {
        setFriendRequests(friendRequestsRes.requests);
      }
    }

    void loadNotes();

    return () => {
      cancelled = true;
    };
  }, [activeView]);

  useEffect(() => {
    if (activeView !== "chat") return;

    let cancelled = false;

    async function loadChat() {
      const [globalRes, groupRes] = await Promise.all([
        listGlobalMessages(),
        selectedGroupId ? listGroupMessages(selectedGroupId) : Promise.resolve({ messages: [] as Message[] })
      ]);

      if (cancelled) return;

      if (globalRes?.messages) {
        setGlobalMessages(globalRes.messages);
      }

      if (groupRes?.messages) {
        setGroupMessages(groupRes.messages);
      }
    }

    void loadChat();

    return () => {
      cancelled = true;
    };
  }, [activeView, selectedGroupId]);

  useEffect(() => {
    if (activeView !== "friends") return;

    let cancelled = false;

    async function loadFriends() {
      const [friendsRes, friendRequestsRes] = await Promise.all([
        listFriends(),
        listFriendRequests()
      ]);

      if (!cancelled) {
        if (friendsRes?.friends) {
          setFriends(friendsRes.friends);
        }

        if (friendRequestsRes?.requests) {
          setFriendRequests(friendRequestsRes.requests);
        }
      }
    }

    void loadFriends();

    return () => {
      cancelled = true;
    };
  }, [activeView]);

  async function refreshCoreData(): Promise<void> {
    const [me, statsData, matchesData, groupsData, friendRequestsData] = await Promise.all([
      getMe(),
      getStats(),
      getMatches(),
      getGroups(),
      listFriendRequests()
    ]);

    setUser((prev) => {
      const base = me.user || prev;
      if (!base) {
        return null;
      }
      return {
        ...base,
        totalStudyMinutes: statsData.totalStudyMinutes ?? base.totalStudyMinutes,
        totalXp: statsData.totalXp ?? base.totalXp
      };
    });

    setGroups(mapGroupsToSummaries(groupsData.groups as ApiGroup[], me.user || null, selectedGroupId, activeSessionId));

    setAllMatches(
      matchesData.matches.map((candidate: any, index: number) => ({
        ...candidate,
        score: Math.max(50, 95 - index * 8)
      }))
    );

    if (friendRequestsData?.requests) {
      setFriendRequests(friendRequestsData.requests);
    }
  }

  const statsText = !user
    ? "No stats yet"
    : `${Math.round(user.totalStudyMinutes / 60)}h total, ${user.totalXp} XP`;

  const studyHours = user ? Number((user.totalStudyMinutes / 60).toFixed(1)) : 0;

  const xpProgress = !user ? 0 : Math.min(100, Math.round((user.totalXp / XP_GOAL) * 100));

  const hoursProgress = !user ? 0 : Math.min(100, Math.round((studyHours / STUDY_HOURS_GOAL) * 100));

  const interestChart = buildInterestChart(user);
  const availableInterests = uniqueInterestTopics(user);
  const matchingInterests = Array.from(
    new Set([...availableInterests, ...allMatches.flatMap((candidate) => candidate.interests?.map((entry) => entry.topic) || [])])
  );
  const filteredMatches = filterMatchesByInterest(allMatches, matchInterest);
  const selectedGroup = groups.find((group) => group.id === selectedGroupId) || null;
  const visibleGroupMessages = groupMessages.filter((message) => message.groupId === selectedGroupId);

  useEffect(() => {
    setUniversityInput(user?.university || "");
    setDepartmentInput(user?.department || "");
  }, [user?.university, user?.department]);

  async function onSaveProfile() {
    const data = await saveProfile({
      university: universityInput,
      department: departmentInput,
      interests: [
        { topic: interestInput, level: "intermediate" },
        { topic: "physics", level: "beginner" }
      ],
      availability: [
        { day: "mon", startHour: 18, endHour: 21 },
        { day: "wed", startHour: 18, endHour: 21 }
      ]
    });

    setUser(data.user || null);
  }

  function onLogout() {
    storeUserSession(null);
    setUser(null);
    setAuthError("");
    setAuthMode("login");
    setActiveView("dashboard");
    setSelectedGroupId("");
    setActiveSessionId("");
    setTrackerSessionId("");
  }

  async function completeAuth(nextUser: User) {
    storeUserSession(nextUser);
    setAuthError("");
    setUser(nextUser);
    setActiveView("dashboard");
    setAuthMode("login");
  }

  async function handleLogin(payload: { email: string; password: string }) {
    setIsAuthenticating(true);
    try {
      const response = await login(payload);
      const profile = await getMe();

      if (!response?.user && !profile?.user) {
        throw new Error("Unable to sign in.");
      }

      await completeAuth((profile?.user || response.user) as User);
    } catch {
      setAuthError("Unable to sign in right now. Check your credentials and try again.");
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function handleSignup(payload: { email: string; username: string; university: string; department: string; password: string }) {
    setIsAuthenticating(true);
    try {
      const response = await register(payload);
      const profile = await getMe();

      if (!response?.user && !profile?.user) {
        throw new Error("Unable to create account.");
      }

      await completeAuth((profile?.user || response.user) as User);
    } catch {
      setAuthError("Unable to create your account right now. Please try again.");
    } finally {
      setIsAuthenticating(false);
    }
  }

  function handleAuthModeChange(nextMode: AuthMode) {
    setAuthError("");
    setAuthMode(nextMode);
    window.history.replaceState({}, "", nextMode === "signup" ? "/signup" : "/login");
  }

  if (!user) {
    return (
      <AuthScreen
        mode={authMode}
        error={authError}
        isSubmitting={isAuthenticating}
        onModeChange={handleAuthModeChange}
        onLogin={handleLogin}
        onSignup={handleSignup}
      />
    );
  }

  function onNavigate(view: View) {
    window.history.pushState({}, "", VIEW_PATHS[view]);
    setActiveView(view);
  }

  async function onCreateNote(data: { title: string; isPrivate: boolean; content: NoteContent[] }) {
    const response = await createNote({
      title: data.title,
      content: data.content,
      isPrivate: data.isPrivate
    });

    setNotes((prev) => [...prev, response.note]);
  }

  async function onToggleNotePrivacy(noteId: string, isPrivate: boolean) {
    await updateNotePrivacy(noteId, isPrivate);
    setNotes((prev) =>
      prev.map((note) =>
        note.id === noteId ? { ...note, isPrivate } : note
      )
    );
  }

  async function onApproveAccessRequest(requestId: string) {
    await approveAccessRequest(requestId);
    setAccessRequests((prev) =>
      prev.map((request) =>
        request.id === requestId ? { ...request, status: "approved" } : request
      )
    );
  }

  async function onRejectAccessRequest(requestId: string) {
    await rejectAccessRequest(requestId);
    setAccessRequests((prev) =>
      prev.map((request) =>
        request.id === requestId ? { ...request, status: "rejected" } : request
      )
    );
  }

  async function onRequestFriend(targetUserId: string) {
    const response = await sendFriendRequest(targetUserId);
    if (response?.request) {
      setFriendRequests((current) => {
        const remaining = current.filter((item) => item.id !== response.request.id);
        return [...remaining, response.request];
      });
    }
  }

  async function onAcceptFriendRequest(requestId: string) {
    const response = await acceptFriendRequest(requestId);
    if (response?.request) {
      setFriendRequests((current) =>
        current.map((item) => (item.id === requestId ? { ...item, status: "accepted" } : item))
      );
      await refreshCoreData();
    }
  }

  async function onRejectFriendRequest(requestId: string) {
    const response = await rejectFriendRequest(requestId);
    if (response?.request) {
      setFriendRequests((current) =>
        current.map((item) => (item.id === requestId ? { ...item, status: "rejected" } : item))
      );
    }
  }

  async function onSendFriendRequest(targetUserId: string) {
    const response = await sendFriendRequest(targetUserId);
    if (response?.request) {
      setFriendRequests((current) => [...current, response.request]);
    }
  }

  function onDeleteNote(noteId: string) {
    setNotes((prev) => prev.filter((note) => note.id !== noteId));
  }

  async function onSendGlobalChat() {
    if (!chatInput.trim()) {
      return;
    }

    const response = await sendGlobalMessage(chatInput.trim());
    if (response?.message) {
      setGlobalMessages((current) => [...current, response.message]);
    }
    setChatInput("");
  }

  async function onSendGroupChat() {
    if (!groupChatInput.trim() || !selectedGroupId) {
      return;
    }

    if (!activeSessionId) {
      setActiveSessionId(`s${Date.now()}`);
    }

    const response = await sendGroupMessage(selectedGroupId, groupChatInput.trim());
    if (response?.message) {
      setGroupMessages((current) => [...current, response.message]);
    }
    setGroupChatInput("");
  }

  function onToggleMatchUser(userId: string) {
    setSelectedMatchUserIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]
    );
  }

  async function onCreateGroup() {
    const name = groupName.trim() || "Study Group";
    const topic = groupTopic.trim() || "general";
    const description = groupDescription.trim() || "Focused study session";

    const response = await createGroup({
      name,
      topic,
      description
    });

    setSelectedGroupId(response.group.id);
    setGroupName("Study Group");
    setGroupTopic("math");
    setGroupDescription("Focused evening study session");
    await refreshCoreData();
  }

  async function onJoinGroup(groupId: string) {
    await joinGroup(groupId);
    setSelectedGroupId(groupId);
    await refreshCoreData();
  }

  function onOpenGroupChat(groupId: string) {
    setSelectedGroupId(groupId);
    window.history.pushState({}, "", VIEW_PATHS.chat);
    setActiveView("chat");
  }

  async function onCreatePartyGroup() {
    if (selectedMatchUserIds.length === 0) {
      return;
    }

    const groupName = partyGroupName.trim() || "Focus Session";
    const response = await createGroup({
      name: groupName,
      topic: matchInterest || "general",
      description: "Created from Matching view",
      invitedUserIds: selectedMatchUserIds
    });

    setSelectedGroupId(response.group.id);
    window.history.pushState({}, "", VIEW_PATHS.chat);
    setActiveView("chat");
    setDemoStatus(`Created group \"${response.group.name}\" with ${selectedMatchUserIds.length} invite(s).`);
    setSelectedMatchUserIds([]);
  }

  function onStartMatchmakingDemo() {
    setIsDemoRunning(true);
    setDemoStatus("Searching for the best study partners...");

    window.setTimeout(() => {
      const candidates = filteredMatches.slice(0, 3);
      setDemoCandidates(candidates);
      setDemoStatus(
        candidates.length > 0
          ? `Found ${candidates.length} candidate(s). Review and create a group.`
          : "No candidates found for this interest."
      );
      setIsDemoRunning(false);
    }, 900);
  }

  function onCreateDemoGroup() {
    if (demoCandidates.length === 0) {
      return;
    }

    setSelectedMatchUserIds(demoCandidates.map((candidate) => candidate.userId));
    setPartyGroupName(`Match Demo ${new Date().toLocaleTimeString()}`);
    setDemoStatus("Demo candidates selected. Click Create Study Session Group.");
  }

  function onStartSession() {
    const sessionId = `session_${Date.now()}`;
    setTrackerSessionId(sessionId);
  }

  function onEndSession() {
    setTrackerSessionId("");
  }

  const headerSubtitle =
    activeView === "dashboard"
      ? `${user?.university || "University"} • ${user?.department || "Department"}`
      : VIEW_META[activeView].subtitle;

  const topbarChips =
    activeView === "notes"
      ? [`${notes.length} notes`, "Click add to create one"]
      : activeView === "matching"
        ? [`${filteredMatches.length} candidates`, `${selectedMatchUserIds.length} selected`]
        : activeView === "groups"
          ? [`${groups.length} groups`, selectedGroupId ? `Active ${selectedGroupId}` : "No active group"]
          : activeView === "friends"
            ? [`${friends.length} friends`, `${friendRequests.filter(r => r.status === "pending").length} pending`]
            : activeView === "tracker"
              ? [trackerSessionId ? "Session Active" : "No Session"]
              : activeView === "chat"
                ? [`${globalMessages.length} global`, selectedGroup ? selectedGroup.name : "No active group"]
                : [user?.username || "Student", statsText];

  return (
    <div className="page">
      <div className="app-shell">
        <MainNav navItems={NAV_ITEMS} activeView={activeView} onNavigate={onNavigate} onLogout={onLogout} />

        <section className="workspace">
          <header className="topbar">
            <div>
              <h2>{VIEW_META[activeView].title}</h2>
              <p>{headerSubtitle}</p>
            </div>
            <div className="topbar-actions">
              {topbarChips.map((chip) => (
                <span key={chip} className="top-chip">
                  {chip}
                </span>
              ))}
            </div>
          </header>

          {activeView === "dashboard" ? (
            <>
              <section className="kpi-strip">
                <article className="kpi-card">
                  <h4>Total XP</h4>
                  <strong>{user?.totalXp ?? 0}</strong>
                </article>
                <article className="kpi-card">
                  <h4>Study Hours</h4>
                  <strong>{studyHours}h</strong>
                </article>
              </section>

              <DashboardView
                user={user}
                statsText={statsText}
                xpGoal={XP_GOAL}
                studyHoursGoal={STUDY_HOURS_GOAL}
                xpProgress={xpProgress}
                hoursProgress={hoursProgress}
                studyHours={studyHours}
                interestChart={interestChart}
                interestInput={interestInput}
                universityInput={universityInput}
                departmentInput={departmentInput}
                onInterestInputChange={setInterestInput}
                onUniversityInputChange={setUniversityInput}
                onDepartmentInputChange={setDepartmentInput}
                onSaveProfile={onSaveProfile}
                friends={friends}
                groups={groups}
              />
            </>
          ) : activeView === "matching" ? (
            <MatchingView
              matchInterest={matchInterest}
              availableInterests={matchingInterests}
              partyGroupName={partyGroupName}
              selectedMatchUserIds={selectedMatchUserIds}
              filteredMatches={filteredMatches}
              demoCandidates={demoCandidates}
              isDemoRunning={isDemoRunning}
              demoStatus={demoStatus}
              onMatchInterestChange={setMatchInterest}
              onPartyGroupNameChange={setPartyGroupName}
              onToggleMatchUser={onToggleMatchUser}
              onRequestFriend={onRequestFriend}
              onStartMatchmakingDemo={onStartMatchmakingDemo}
              onCreateDemoGroup={onCreateDemoGroup}
              onCreatePartyGroup={onCreatePartyGroup}
            />
          ) : activeView === "groups" ? (
            <GroupsView
              groupName={groupName}
              groupTopic={groupTopic}
              groupDescription={groupDescription}
              groups={groups}
              onGroupNameChange={setGroupName}
              onGroupTopicChange={setGroupTopic}
              onGroupDescriptionChange={setGroupDescription}
              onCreateGroup={onCreateGroup}
              onJoinGroup={onJoinGroup}
              onOpenGroupChat={onOpenGroupChat}
            />
          ) : activeView === "notes" ? (
            <NotesView
              notes={notes}
              currentUserId={user?.id || ""}
              onAddNote={onCreateNote}
              onTogglePrivacy={onToggleNotePrivacy}
              onDeleteNote={onDeleteNote}
              onApproveRequest={onApproveAccessRequest}
              onRejectRequest={onRejectAccessRequest}
              friendRequests={friendRequests}
              onAcceptFriendRequest={onAcceptFriendRequest}
              onRejectFriendRequest={onRejectFriendRequest}
              accessRequests={accessRequests}
            />
          ) : activeView === "friends" ? (
            <FriendsView
              friends={friends}
              friendRequests={friendRequests}
              currentUserId={user?.id || ""}
              onAcceptFriendRequest={onAcceptFriendRequest}
              onRejectFriendRequest={onRejectFriendRequest}
              onSendFriendRequest={onSendFriendRequest}
            />
          ) : activeView === "chat" ? (
            <ChatView
              groups={groups}
              globalMessages={globalMessages}
              groupMessages={visibleGroupMessages}
              selectedGroupId={selectedGroupId}
              selectedGroup={selectedGroup}
              activeSessionId={activeSessionId}
              chatInput={chatInput}
              groupChatInput={groupChatInput}
              onChatInputChange={setChatInput}
              onGroupChatInputChange={setGroupChatInput}
              onSendGlobalChat={onSendGlobalChat}
              onSendGroupChat={onSendGroupChat}
              onSelectGroup={setSelectedGroupId}
              onRequestFriend={onRequestFriend}
            />
          ) : (
            <TrackerView
              statsText={statsText}
              xpProgress={xpProgress}
              hoursProgress={hoursProgress}
              activeSessionId={trackerSessionId}
              onStartSession={onStartSession}
              onEndSession={onEndSession}
            />
          )}
        </section>
      </div>
    </div>
  );
}

export default App;
